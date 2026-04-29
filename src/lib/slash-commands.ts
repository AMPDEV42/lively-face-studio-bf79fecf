/**
 * Slash command handler — extracted from ChatPanel.tsx
 * Returns { handled: true } if the command was consumed, { handled: false } otherwise.
 */

export interface SlashCommandContext {
  availableAnimations: string[];
  onPlayAnim: (animName: string) => void;
  onNewConversation: () => void;
  onMoodChange?: (mood: string) => void;
}

export interface SlashCommandResult {
  handled: boolean;
  /** If set, display this text as an assistant message (no AI call needed) */
  response?: string;
}

const ANIM_SHORTCUTS: Record<string, string> = {
  dance: 'Silly_Dance',
  wave: 'Wave',
  bow: 'Bow',
  think: 'Thinking',
  laugh: 'Laughing',
};

// Valid mood names that map to VRM expressions
const VALID_MOODS = [
  'happy', 'sad', 'angry', 'surprised', 'embarrassed',
  'excited', 'laughing', 'sympathetic', 'disgusted',
  'curious', 'thinking', 'bored', 'neutral', 'relaxed',
];

export function handleSlashCommand(
  rawText: string,
  ctx: SlashCommandContext,
): SlashCommandResult {
  if (!rawText.startsWith('/')) return { handled: false };

  const parts = rawText.slice(1).split(' ');
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  // /anim <name> or /play <name>
  if (cmd === 'anim' || cmd === 'play') {
    const animName = arg || rawText.slice(1);
    ctx.onPlayAnim(animName);
    return { handled: true };
  }

  // Direct animation name (e.g. /Silly_Dance)
  if (ctx.availableAnimations.includes(rawText.slice(1))) {
    ctx.onPlayAnim(rawText.slice(1));
    return { handled: true };
  }

  // Shortcut animations
  if (ANIM_SHORTCUTS[cmd]) {
    ctx.onPlayAnim(ANIM_SHORTCUTS[cmd]);
    return { handled: true };
  }

  // /mood <name> — trigger VRM expression without sending to AI
  if (cmd === 'mood') {
    const moodName = arg.toLowerCase();
    if (!moodName) {
      return {
        handled: true,
        response: `**Mood yang tersedia:** ${VALID_MOODS.join(', ')}\n\nContoh: \`/mood happy\``,
      };
    }
    if (!VALID_MOODS.includes(moodName)) {
      return {
        handled: true,
        response: `Mood "${moodName}" tidak dikenal.\n\n**Mood yang tersedia:** ${VALID_MOODS.join(', ')}`,
      };
    }
    ctx.onMoodChange?.(moodName);
    return {
      handled: true,
      response: `Ekspresi diubah ke **${moodName}** ✨`,
    };
  }

  // /clear
  if (cmd === 'clear') {
    ctx.onNewConversation();
    return { handled: true };
  }

  // /help
  if (cmd === 'help') {
    const animList = ctx.availableAnimations.length > 0
      ? `\n\n**Animasi tersedia:** ${ctx.availableAnimations.slice(0, 10).join(', ')}${ctx.availableAnimations.length > 10 ? ` +${ctx.availableAnimations.length - 10} lainnya` : ''}`
      : '';

    const response = [
      '**Slash Commands yang tersedia:**',
      '`/dance` — animasi dance',
      '`/wave` — animasi wave',
      '`/bow` — animasi bow',
      '`/think` — animasi thinking',
      '`/laugh` — animasi laughing',
      '`/anim <nama>` — mainkan animasi custom',
      '`/mood <nama>` — ubah ekspresi VRM (happy, sad, angry, dll)',
      '`/clear` — mulai percakapan baru',
      '',
      '**Keyboard Shortcuts:**',
      '`Ctrl+K` — buka/tutup chat',
      '`1` `2` `3` `4` — preset kamera',
      '`P` — toggle efek partikel',
      '`M` — mute/unmute suara',
      '`E` — panel ekspresi',
      '`Esc` — tutup chat',
    ].join('\n') + animList;

    return { handled: true, response };
  }

  return { handled: false };
}
