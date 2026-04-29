/**
 * Utility for Hugging Face VITS (Gradio 4 API)
 * Specifically for Plachta/VITS-Umamusume-voice-synthesizer
 */

const HF_SPACE_URL = "https://plachta-vits-umamusume-voice-synthesizer.hf.space";
const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;

export interface VitsRequest {
  text: string;
  speaker: string;
  language: string;
  speed: number;
}

/**
 * Free translation using Google's public API (client-side)
 */
export async function translateToJapanese(text: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url);
    if (!resp.ok) return text;
    const data = await resp.json();
    if (data && data[0]) {
      return data[0].map((item: any) => item[0]).join("");
    }
    return text;
  } catch {
    return text;
  }
}

/**
 * VITS API has an undocumented character limit (~150 Japanese chars / ~200 Latin chars).
 * Truncate to the first sentence to prevent audio cutoff.
 */
export function truncateForVits(text: string, maxChars = 150): string {
  if (text.length <= maxChars) return text;
  // Try to cut at sentence boundary (。!?！？\n)
  const sentenceEnd = text.search(/[。！？!?\n]/);
  if (sentenceEnd > 0 && sentenceEnd <= maxChars) {
    return text.slice(0, sentenceEnd + 1).trim();
  }
  // Fallback: cut at last space/word boundary before limit
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export async function generateVitsAudio({
  text,
  speaker = "特别周 Special Week (Umamusume Pretty Derby)", 
  language = "日本語",
  speed = 1.0,
  signal,
}: VitsRequest & { signal?: AbortSignal }): Promise<string> {
  // Use public mirror by default, but allow override via localStorage
  const customUrl = localStorage.getItem('vrm.vits_custom_url');
  const baseUrl = customUrl || HF_SPACE_URL;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (HF_TOKEN) {
    headers["Authorization"] = `Bearer ${HF_TOKEN}`;
  }

  // Gradio 4 flow for /tts_fn
  // data: [text, character, language, speed, symbol_input]
  const callRes = await fetch(`${baseUrl.replace(/\/$/, '')}/gradio_api/call/tts_fn`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: [
        text,
        speaker,
        language,
        speed,
        false // Symbol input (Checkbox)
      ]
    })
  });

  if (!callRes.ok) {
    const errText = await callRes.text();
    throw new Error(`HF API Call failed: ${callRes.status} ${errText}`);
  }

  const { event_id } = await callRes.json();

  return new Promise((resolve, reject) => {
    // Abort immediately if signal already aborted
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }

    const eventSource = new EventSource(`${baseUrl.replace(/\/$/, '')}/gradio_api/call/tts_fn/${event_id}`);

    // Wire AbortSignal → close EventSource
    const onAbort = () => {
      eventSource.close();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    
    eventSource.addEventListener("complete", (event: any) => {
      eventSource.close();
      cleanup();
      try {
        const parsed = JSON.parse(event.data);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const audioData = parsed[1];
          if (audioData && audioData.url) resolve(audioData.url);
          else if (audioData && audioData.name) resolve(`${baseUrl.replace(/\/$/, '')}/file=${audioData.name}`);
          else reject(new Error("Audio URL not found in completion data"));
        } else {
          reject(new Error("Unexpected completion data format"));
        }
      } catch (e) {
        reject(new Error("Failed to parse completion data"));
      }
    });

    eventSource.addEventListener("error", (event: any) => {
      eventSource.close();
      cleanup();
      let errorMsg = "Gradio process error (Check character name or language)";
      try {
        const parsed = JSON.parse(event.data);
        errorMsg = parsed.message || errorMsg;
      } catch (e) {}
      reject(new Error(errorMsg));
    });

    eventSource.onerror = (err) => {
      if (eventSource.readyState === 2) return;
      eventSource.close();
      cleanup();
      reject(new Error("VITS SSE Connection failed - Space might be busy or sleeping"));
    };

    setTimeout(() => {
      if (eventSource.readyState !== 2) {
        eventSource.close();
        cleanup();
        reject(new Error("VITS Audio generation timeout (60s)"));
      }
    }, 60000);
  });
}

// EXACT MATCH NAMES required by the server (Chinese prefix is MANDATORY)
export const UMAMUSUME_SPEAKERS = [
  "特别周 Special Week (Umamusume Pretty Derby)",
  "无声铃鹿 Silence Suzuka (Umamusume Pretty Derby)",
  "东海帝王 Tokai Teio (Umamusume Pretty Derby)",
  "丸善斯基 Maruzensky (Umamusume Pretty Derby)",
  "富士奇迹 Fuji Kiseki (Umamusume Pretty Derby)",
  "小栗帽 Oguri Cap (Umamusume Pretty Derby)",
  "黄金船 Gold Ship (Umamusume Pretty Derby)",
  "伏特加 Vodka (Umamusume Pretty Derby)",
  "大和赤骥 Daiwa Scarlet (Umamusume Pretty Derby)",
  "目白麦昆 Mejiro McQueen (Umamusume Pretty Derby)",
  "曼哈顿咖啡 Manhattan Cafe (Umamusume Pretty Derby)",
  "爱丽速子 Agnes Tachyon (Umamusume Pretty Derby)",
  "米浴 Rice Shower (Umamusume Pretty Derby)",
  "胜利奖券 Winning Ticket (Umamusume Pretty Derby)",
  "樱花进王 Sakura Bakushin O (Umamusume Pretty Derby)",
  "春乌拉拉 Haru Urara (Umamusume Pretty Derby)",
  "待兼福来 Matikanefukuitaru (Umamusume Pretty Derby)",
  "优秀素质 Nice Nature (Umamusume Pretty Derby)",
  "帝王光辉 King Halo (Umamusume Pretty Derby)"
];
