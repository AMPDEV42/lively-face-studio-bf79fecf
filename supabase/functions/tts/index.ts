import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const TTS_RATE_LIMIT = 30;        // requests per window
const TTS_RATE_WINDOW_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// TTS Cache — Supabase Storage bucket "tts-cache"
// ---------------------------------------------------------------------------

interface TtsCacheMetadata {
  textHash: string;    // SHA-256 prefix from text+voiceId
  voiceId: string;
  createdAt: string;   // ISO timestamp
  expiresAt: string;   // ISO timestamp (createdAt + 24h)
  hitCount: number;    // for analytics
}

const TTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TTS_CACHE_BUCKET = "tts-cache";

/**
 * Compute a 16-character SHA-256 prefix cache key from text + voiceId.
 * Uses Web Crypto API (available in Deno).
 */
async function getCacheKey(text: string, voiceId: string): Promise<string> {
  const data = new TextEncoder().encode(`${text}:${voiceId}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 16); // 16 char prefix
}

/**
 * Convert a Blob to a base64-encoded string.
 */
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  return base64Encode(arrayBuffer);
}

/**
 * Look up cached audio in Supabase Storage.
 * Returns base64-encoded audio string if found and not expired, null otherwise.
 */
async function getCachedAudio(
  key: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    // Check metadata first to verify TTL
    const { data: metaData, error: metaError } = await supabase.storage
      .from(TTS_CACHE_BUCKET)
      .download(`${key}.json`);

    if (metaError || !metaData) {
      return null; // cache miss
    }

    const metaText = await metaData.text();
    const metadata: TtsCacheMetadata = JSON.parse(metaText);

    // Check if cache entry has expired
    if (new Date(metadata.expiresAt).getTime() < Date.now()) {
      console.log(`[TTS Cache] Entry ${key} expired, cache miss`);
      return null;
    }

    // Download the audio file
    const { data: audioData, error: audioError } = await supabase.storage
      .from(TTS_CACHE_BUCKET)
      .download(`${key}.mp3`);

    if (audioError || !audioData) {
      return null; // audio file missing
    }

    console.log(`[TTS Cache] Cache hit for key ${key}`);
    return await blobToBase64(audioData);
  } catch (err) {
    console.error("[TTS Cache] getCachedAudio error:", err);
    return null; // graceful degradation
  }
}

/**
 * Save audio to Supabase Storage cache with metadata JSON.
 * Errors are caught and logged — cache failure does not affect audio delivery.
 */
async function saveCachedAudio(
  key: string,
  audioBuffer: ArrayBuffer,
  voiceId: string,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTS_CACHE_TTL_MS);

    const metadata: TtsCacheMetadata = {
      textHash: key,
      voiceId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hitCount: 0,
    };

    // Upload audio file
    const { error: audioError } = await supabase.storage
      .from(TTS_CACHE_BUCKET)
      .upload(`${key}.mp3`, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (audioError) {
      console.error("[TTS Cache] Failed to upload audio:", audioError.message);
      return;
    }

    // Upload metadata JSON
    const metaBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const { error: metaError } = await supabase.storage
      .from(TTS_CACHE_BUCKET)
      .upload(`${key}.json`, metaBytes, {
        contentType: "application/json",
        upsert: true,
      });

    if (metaError) {
      console.error("[TTS Cache] Failed to upload metadata:", metaError.message);
      return;
    }

    console.log(`[TTS Cache] Saved audio for key ${key}, expires ${expiresAt.toISOString()}`);
  } catch (err) {
    console.error("[TTS Cache] saveCachedAudio error:", err);
    // Graceful degradation — cache failure does not affect audio delivery
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// Plan limits
const PRO_TTS_CHARS_PER_MONTH = 50_000;

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
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

    // Per-instance rate limit
    const { allowed, retryAfter } = await checkRateLimit(userId, TTS_RATE_LIMIT, TTS_RATE_WINDOW_MS);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter ?? 60) } },
      );
    }

    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    // PLAN GATE — ElevenLabs (premium TTS) is Pro-only
    // ------------------------------------------------------------------
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
    const isAdmin = roleSet.has("admin");
    const isPro = isAdmin || roleSet.has("pro");

    if (!isPro) {
      return new Response(JSON.stringify({
        error: "PRO_ONLY",
        message: "Premium TTS hanya tersedia untuk pengguna Pro. Silakan upgrade.",
      }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quota: chars per month (admin = unlimited)
    const period = currentPeriod();
    const charCount = text.length;

    const { data: usageRow } = await supabaseAdmin
      .from("usage_log")
      .upsert({ user_id: userId, period }, { onConflict: "user_id,period" })
      .select("tts_chars_count, topup_tts_chars")
      .single();

    const usedChars = usageRow?.tts_chars_count ?? 0;
    const topUp = usageRow?.topup_tts_chars ?? 0;

    if (!isAdmin && usedChars + charCount > PRO_TTS_CHARS_PER_MONTH + topUp) {
      return new Response(JSON.stringify({
        error: "QUOTA_EXCEEDED",
        message: "Kuota karakter TTS bulanan habis. Silakan top-up.",
      }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedVoice = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah voice

    // ------------------------------------------------------------------
    // TTS Cache — check before calling ElevenLabs
    // Use SERVICE_ROLE_KEY for storage write access
    // ------------------------------------------------------------------
    let supabaseStorage: SupabaseClient | null = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabaseStorage = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    const cacheKey = await getCacheKey(text, selectedVoice);

    if (supabaseStorage) {
      const cachedAudio = await getCachedAudio(cacheKey, supabaseStorage);
      if (cachedAudio) {
        // Cache hit — return cached audio directly
        return new Response(
          JSON.stringify({ audioContent: cachedAudio, cached: true }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-Cache": "HIT",
            },
          },
        );
      }
    }

    // ------------------------------------------------------------------
    // Cache miss — call ElevenLabs API
    // ------------------------------------------------------------------
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs error:", response.status, err);
      return new Response(JSON.stringify({ error: "TTS generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    // Increment usage counter (only on actual generation, not cache hit)
    supabaseAdmin.from("usage_log")
      .update({ tts_chars_count: usedChars + charCount })
      .eq("user_id", userId).eq("period", period)
      .then(() => {}, (err: unknown) => console.error("[TTS] usage update failed:", err));

    // ------------------------------------------------------------------
    // Save to cache after successful generation (fire-and-forget)
    // ------------------------------------------------------------------
    if (supabaseStorage) {
      // Do not await — cache save should not delay the response
      saveCachedAudio(cacheKey, audioBuffer, selectedVoice, supabaseStorage).catch(
        (err) => console.error("[TTS Cache] Background save failed:", err),
      );
    }

    return new Response(
      JSON.stringify({ audioContent: base64Audio, cached: false }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache": "MISS",
        },
      },
    );
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
