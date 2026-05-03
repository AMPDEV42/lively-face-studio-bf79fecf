// Shared AI helper: tries Lovable AI Gateway first, falls back to DeepSeek
// when Lovable returns 429 (rate-limited) or 402 (out of credits).
//
// Both providers expose an OpenAI-compatible /v1/chat/completions endpoint with
// identical SSE streaming format, so the response body can be passed through
// to the client without parser changes.

export interface CallAIOptions {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  model?: string;
  reasoning?: { effort: string };
  tools?: unknown;
  tool_choice?: unknown;
  temperature?: number;
}

export interface CallAIResult {
  response: Response;
  provider: "lovable" | "deepseek";
}

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

function mapModelForDeepseek(model: string | undefined, reasoning?: { effort: string }): string {
  if (reasoning && reasoning.effort && reasoning.effort !== "none" && reasoning.effort !== "minimal") {
    return "deepseek-reasoner";
  }
  // Map any Gemini/GPT model id to deepseek-chat (OpenAI-compatible).
  return "deepseek-chat";
}

export async function callAI(opts: CallAIOptions): Promise<CallAIResult> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  const model = opts.model ?? "google/gemini-3-flash-preview";

  const baseBody: Record<string, unknown> = {
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.reasoning) baseBody.reasoning = opts.reasoning;
  if (opts.tools) baseBody.tools = opts.tools;
  if (opts.tool_choice) baseBody.tool_choice = opts.tool_choice;
  if (typeof opts.temperature === "number") baseBody.temperature = opts.temperature;

  // ── Try Lovable AI first ──────────────────────────────────────────────
  if (lovableKey) {
    try {
      const resp = await fetch(LOVABLE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...baseBody, model }),
      });
      if (resp.ok) return { response: resp, provider: "lovable" };

      // Only fallback on quota / rate-limit failures
      if (resp.status === 429 || resp.status === 402) {
        console.warn(`[AI fallback] Lovable -> DeepSeek (status=${resp.status})`);
        // Drain body to release connection
        try { await resp.text(); } catch { /* ignore */ }
      } else {
        // Non-quota error → propagate as-is
        return { response: resp, provider: "lovable" };
      }
    } catch (e) {
      console.warn("[AI fallback] Lovable network error, trying DeepSeek:", e);
    }
  }

  // ── Fallback: DeepSeek ────────────────────────────────────────────────
  if (!deepseekKey) {
    return {
      response: new Response(
        JSON.stringify({ error: "AI providers unavailable (Lovable quota exhausted, DeepSeek not configured)" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
      provider: "lovable",
    };
  }

  const dsModel = mapModelForDeepseek(opts.model, opts.reasoning);
  const dsBody = { ...baseBody, model: dsModel };
  // DeepSeek doesn't support `reasoning` field — strip
  delete (dsBody as Record<string, unknown>).reasoning;

  const dsResp = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepseekKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dsBody),
  });
  return { response: dsResp, provider: "deepseek" };
}
