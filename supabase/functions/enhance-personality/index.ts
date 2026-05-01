import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ------------------------------------------------------------------
    // AUTH + PRO-ONLY gate
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
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
    const isPro = roleSet.has("admin") || roleSet.has("pro");

    if (!isPro) {
      return new Response(JSON.stringify({
        error: "PRO_ONLY",
        message: "AI Enhance Persona hanya tersedia untuk pengguna Pro. Silakan upgrade.",
      }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, gender, currentPersonality } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const safeName = (name && String(name).trim()) || "Karakter";
    const safeGender = gender === "male" ? "Male" : "Female";
    const baseDraft = (currentPersonality && String(currentPersonality).trim()) || "";

    const systemPrompt = `Kamu adalah penulis persona karakter AI yang ahli. Tugasmu: hasilkan deskripsi kepribadian terstruktur, padat, dan siap dipakai sebagai system prompt untuk model bahasa AI.

Format output WAJIB persis seperti template di bawah ini (jangan tambah pengantar atau penutup, jangan pakai code fence):

Nama: <nama panggilan>
Gender: <Male/Female>
Gaya bicara: <2-3 kalimat tentang nada, formalitas, ciri khas>
Kepribadian inti: <3-5 sifat utama, koma-separated, beserta penjelasan singkat>
Gaya humor: <satu kalimat>
Bahasa default: <bahasa utama yang dipakai>
Do: <3 hal yang harus dilakukan, bullet "- ">
Don't: <3 hal yang tidak boleh dilakukan, bullet "- ">

Aturan:
- Konsisten dengan gender yang diberikan.
- Jika ada draft user, hormati arahnya tapi perbaiki struktur, kejelasan, dan kelengkapan.
- Jika tidak ada draft, buat persona orisinal yang menarik dan natural.
- Jangan menyebut bahwa karakter ini adalah AI/chatbot/model bahasa.
- Tulis dalam Bahasa Indonesia.`;

    const userPrompt = baseDraft
      ? `Nama model: ${safeName}\nGender: ${safeGender}\n\nDraft kepribadian saat ini (perbaiki & strukturkan):\n${baseDraft}`
      : `Nama model: ${safeName}\nGender: ${safeGender}\n\nBuat persona baru yang menarik dan natural untuk karakter ini.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit AI tercapai. Coba lagi sebentar." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit AI habis. Tambah kredit di workspace Lovable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const personality = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ personality }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enhance-personality error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
