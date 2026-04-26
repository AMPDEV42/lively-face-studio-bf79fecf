/**
 * SFX Generator — jalankan sekali untuk generate semua suara interaksi
 * Usage: node scripts/generate-sfx.mjs
 *
 * Membutuhkan koneksi internet untuk memanggil Hugging Face VITS API.
 * Audio disimpan ke public/sfx/ dan dapat digunakan offline setelahnya.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const HF_SPACE_URL = 'https://plachta-vits-umamusume-voice-synthesizer.hf.space';

// Speaker yang akan digunakan — karakter default
const SPEAKER = '特别周 Special Week (Umamusume Pretty Derby)';
const LANGUAGE = '日本語';

// 10 suara headpat — ekspresi senang, geli, malu
const HEADPAT_LINES = [
  { file: 'hp_01.mp3', text: 'きゃあ！なでなでしてくれるの？えへへ〜。' },
  { file: 'hp_02.mp3', text: 'もう、くすぐったいよ〜！' },
  { file: 'hp_03.mp3', text: 'わあ、気持ちいい！もっとなでて。' },
  { file: 'hp_04.mp3', text: 'えへへ、ありがとう。なんか照れちゃう。' },
  { file: 'hp_05.mp3', text: 'やあん、頭なでないでよ〜！' },
  { file: 'hp_06.mp3', text: 'わ、わ！びっくりした〜。でも嬉しい！' },
  { file: 'hp_07.mp3', text: 'ずっとなでていてもいいよ？えへへ。' },
  { file: 'hp_08.mp3', text: 'んもう、かわいがりすぎだよ！' },
  { file: 'hp_09.mp3', text: 'あ〜、幸せ。このままずっとこうしてたい。' },
  { file: 'hp_10.mp3', text: 'えへへへ〜。' },
];

// 10 suara shoulder tap — ekspresi kaget, panggil, protes lucu
const TAP_LINES = [
  { file: 'tap_01.mp3', text: 'え、なに！？びっくりしたー！' },
  { file: 'tap_02.mp3', text: 'はいはい、なんですか？' },
  { file: 'tap_03.mp3', text: 'わっ！急にどうしたの？' },
  { file: 'tap_04.mp3', text: 'もう、驚かさないでよ〜！' },
  { file: 'tap_05.mp3', text: 'ん？呼んだ？なに？なに？' },
  { file: 'tap_06.mp3', text: 'ちょっと、何？用があるなら言ってよ。' },
  { file: 'tap_07.mp3', text: 'え、えっと…どうかした？' },
  { file: 'tap_08.mp3', text: 'あ、ここにいるよ！何かあった？' },
  { file: 'tap_09.mp3', text: 'はい！なんでしょう？' },
  { file: 'tap_10.mp3', text: 'えっ！？ちゃんと聞いてるよ！' },
];

async function callVITS(text) {
  const res = await fetch(`${HF_SPACE_URL}/gradio_api/call/tts_fn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [text, SPEAKER, LANGUAGE, 1.0, false]
    })
  });

  if (!res.ok) throw new Error(`API call failed: ${res.status}`);
  const { event_id } = await res.json();

  return new Promise((resolve, reject) => {
    const url = `${HF_SPACE_URL}/gradio_api/call/tts_fn/${event_id}`;
    let buffer = '';

    const fetchSSE = async () => {
      const resp = await fetch(url);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('event: complete')) continue;
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (Array.isArray(parsed) && parsed[1]) {
                const audio = parsed[1];
                const audioUrl = audio.url || `${HF_SPACE_URL}/file=${audio.name}`;
                resolve(audioUrl);
                return;
              }
            } catch { /* keep reading */ }
          }
          if (line.startsWith('event: error')) {
            reject(new Error('VITS generation error'));
            return;
          }
        }
      }
      reject(new Error('SSE stream ended without result'));
    };

    fetchSSE().catch(reject);
    setTimeout(() => reject(new Error('Timeout after 90s')), 90000);
  });
}

async function downloadAudio(url, destPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

async function generateBank(lines, folder, bankName) {
  const dir = path.join(ROOT, 'public', 'sfx', folder);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`\n=== Generating ${bankName} (${lines.length} files) ===`);

  for (let i = 0; i < lines.length; i++) {
    const { file, text } = lines[i];
    const destPath = path.join(dir, file);

    if (fs.existsSync(destPath)) {
      console.log(`  [${i + 1}/${lines.length}] SKIP (exists): ${file}`);
      continue;
    }

    console.log(`  [${i + 1}/${lines.length}] Generating: "${text.substring(0, 30)}..."`);
    try {
      const audioUrl = await callVITS(text);
      console.log(`    → Audio URL: ${audioUrl.substring(0, 60)}...`);
      await downloadAudio(audioUrl, destPath);
      console.log(`    ✓ Saved: ${file}`);
      // Jeda antar request biar tidak rate-limited
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`    ✗ FAILED: ${file} — ${err.message}`);
    }
  }
}

async function main() {
  console.log('🎤 Lively Face Studio — SFX Generator');
  console.log('=====================================');
  console.log(`VITS Space: ${HF_SPACE_URL}`);
  console.log(`Speaker: ${SPEAKER}`);

  await generateBank(HEADPAT_LINES, 'headpat', 'Headpat SFX');
  await generateBank(TAP_LINES, 'tap', 'Shoulder Tap SFX');

  console.log('\n✅ Done! All audio saved to public/sfx/');
  console.log('Restart the dev server if it was running.');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
