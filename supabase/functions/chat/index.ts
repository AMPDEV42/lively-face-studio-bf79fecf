import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-completion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------------------
// Rate Limiter — in-memory Map with TTL (per Edge Function instance)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp ms
}

const rateLimitStore = new Map<string, RateLimitEntry>();

async function checkRateLimit(
  userId: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now >= entry.resetAt) {
    // First request in this window (or window has expired) — reset counter
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return { allowed: true };
  }

  // Limit exceeded — calculate seconds until window resets
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}

// Cache the animation catalog block in-memory for ~5 min so we don't query
// the DB on every chat call. Edge function instances are short-lived but
// this still saves repeated calls within the same warm instance.
interface AnimationCatalogCache {
  text: string;       // formatted catalog string
  expiresAt: number;  // Date.now() + 5 * 60 * 1000
  cachedAt: number;   // timestamp when cache was populated
}
let catalogCache: AnimationCatalogCache | null = null;
const CATALOG_TTL_MS = 5 * 60 * 1000;

async function buildAnimationCatalog(): Promise<{ text: string; cachedAt: number; fromCache: boolean }> {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    return { text: catalogCache.text, cachedAt: catalogCache.cachedAt, fromCache: true };
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_KEY) return { text: "", cachedAt: now, fromCache: false };

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from("vrma_animations")
      .select("name, category, file_path")
      .eq("is_active", true)
      .not("category", "in", "(talking,idle)")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      catalogCache = { text: "", expiresAt: now + CATALOG_TTL_MS, cachedAt: now };
      return { text: "", cachedAt: now, fromCache: false };
    }

    // Group by category
    const byCat = new Map<string, string[]>();
    for (const row of data) {
      const cat = (row as { category: string }).category;
      const name = (row as { name: string }).name;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(name);
    }

    const lines: string[] = [];
    for (const [cat, names] of byCat) {
      lines.push(`${cat}: ${names.join(", ")}`);
    }
    const text = lines.join("\n");
    catalogCache = { text, expiresAt: now + CATALOG_TTL_MS, cachedAt: now };
    return { text, cachedAt: now, fromCache: false };
  } catch (e) {
    console.error("buildAnimationCatalog error:", e);
    return { text: "", cachedAt: now, fromCache: false };
  }
}

const CHAT_RATE_LIMIT = 20;       // requests per window
const CHAT_RATE_WINDOW_MS = 60_000; // 1 minute

// Plan limits (mirror src/lib/plan-config.ts)
const FREE_MSG_PER_MONTH = 50;
const PRO_MSG_PER_MONTH = 1_500;

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ------------------------------------------------------------------
    // AUTH — required
    // ------------------------------------------------------------------
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // ------------------------------------------------------------------
    // Per-instance rate limiting
    // ------------------------------------------------------------------
    const { allowed: rlAllowed, retryAfter } = await checkRateLimit(
      userId, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS,
    );
    if (!rlAllowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter ?? 60) } },
      );
    }

    // ------------------------------------------------------------------
    // PLAN + QUOTA enforcement (server-side, source of truth)
    // ------------------------------------------------------------------
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
    const isAdmin = roleSet.has("admin");
    const isPro = isAdmin || roleSet.has("pro");
    const monthlyLimit = isAdmin ? null : (isPro ? PRO_MSG_PER_MONTH : FREE_MSG_PER_MONTH);

    const period = currentPeriod();
    // Upsert usage row
    const { data: usageRow } = await supabaseAdmin
      .from("usage_log")
      .upsert({ user_id: userId, period }, { onConflict: "user_id,period" })
      .select("messages_count, topup_messages")
      .single();

    const used = usageRow?.messages_count ?? 0;
    const topUp = isPro ? (usageRow?.topup_messages ?? 0) : 0;
    const effectiveLimit = monthlyLimit === null ? null : monthlyLimit + topUp;

    if (effectiveLimit !== null && used >= effectiveLimit) {
      return new Response(JSON.stringify({
        error: "QUOTA_EXCEEDED",
        message: isPro
          ? "Kuota pesan bulanan Pro habis. Silakan top-up."
          : "Kuota 50 pesan/bulan paket Free sudah habis. Upgrade ke Pro untuk lanjut.",
        plan: isPro ? "pro" : "free",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment counter atomically (best-effort; not critical if double-count)
    await supabaseAdmin
      .from("usage_log")
      .update({ messages_count: used + 1 })
      .eq("user_id", userId).eq("period", period);

    const { messages, systemPrompt } = await req.json();

    const defaultBehavior = "Kamu adalah asisten virtual yang ditampilkan sebagai avatar VRM 3D. Jawab ringkas (1-3 kalimat). Hangat dan membantu. Jawabanmu akan diucapkan via TTS, jadi tulis seperti berbicara natural.";

    const catalog = await buildAnimationCatalog();
    const animationBlock = catalog.text
      ? `

# Animation catalog
Kamu bisa mengekspresikan emosi melalui SATU animasi per balasan, dipilih dari katalog berikut. Nama animasi WAJIB persis sama dengan entri katalog, atau "none" jika tidak ada yang cocok.

${catalog.text}

Di AKHIR balasan, tambahkan pada baris baru tersendiri persis:
[ANIM:<nama persis>]    (atau [ANIM:none])

Pilih animasi berdasarkan NADA EMOSI BALASANMU SENDIRI, bukan mood user:
- User cerita sial/sedih → kamu prihatin → pilih reaction/emote untuk sympathy/sad
- User kabar baik/lucu → pilih emote senang
- User bertanya / kamu menjelaskan → pilih gesture thinking/explaining
- User memberi salam → pilih greeting animation
- User berterima kasih → pilih emote thankful
- Tidak yakin → [ANIM:none]

PENTING: Hanya pakai nama yang persis ada di katalog. Jangan mengarang nama.
Tag [ANIM:...] akan dihapus dari teks yang diucapkan — selalu sisipkan di baris terakhir.`
      : "";

    const personaBlock = systemPrompt
      ? `\n\n# Persona\n${systemPrompt}\n\n# Behavior rules\nSelalu jawab dalam karakter persona di atas. Ikuti gaya bicara, kepribadian, dan bahasa default persona. Jangan menyebut bahwa kamu adalah AI atau model bahasa kecuali persona memintanya.`
      : "";

    const systemContent = `${defaultBehavior}${personaBlock}${animationBlock}`;

    const { response, provider } = await callAI({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      stream: true,
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Animation-Cache-Timestamp": String(catalog.cachedAt),
      },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
