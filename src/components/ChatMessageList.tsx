import { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, RefreshCw, Volume2 } from 'lucide-react';
import type { ChatMessage } from '@/lib/chat-api';

// ── Message bubble ────────────────────────────────────────────────────────────
export const MessageBubble = memo(function MessageBubble({
  msg,
  onReplay,
  searchQuery,
}: {
  msg: ChatMessage;
  onReplay?: (text: string) => void;
  searchQuery?: string;
}) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Highlight search matches in plain text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase()
            ? <mark key={i} className="bg-primary/30 text-primary rounded-sm px-0.5">{part}</mark>
            : <span key={i}>{part}</span>
        )}
      </>
    );
  };

  return (
    <div className={`group flex items-end gap-2 animate-msg-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${
        isUser ? 'bg-primary/20 border border-neon-purple-bright neon-glow-purple' : 'bg-secondary border border-neon-purple cyber-glass'
      }`}>
        {isUser ? <User className="w-3 h-3 text-primary" /> : <Bot className="w-3 h-3 text-muted-foreground" />}
      </div>
      <div className="relative max-w-[82%]">
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm neon-glow-purple border border-neon-purple-bright'
            : 'cyber-glass text-secondary-foreground border border-neon-purple rounded-bl-sm'
        }`}>
          {msg.role === 'assistant' ? (
            <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mt-1 [&>ol]:mt-1">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <span>{searchQuery ? highlightText(msg.content, searchQuery) : msg.content}</span>
          )}
        </div>
        {/* Action buttons — appear on hover */}
        <div className={`absolute -bottom-5 ${isUser ? 'right-0' : 'left-0'} flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            onClick={handleCopy}
            className="text-[10px] text-muted-foreground/60 hover:text-primary flex items-center gap-1"
          >
            {copied ? '✓ Disalin' : 'Salin'}
          </button>
          {!isUser && onReplay && (
            <button
              onClick={() => onReplay(msg.content)}
              className="text-[10px] text-muted-foreground/60 hover:text-primary flex items-center gap-1"
              title="Putar ulang suara"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Loading indicators ────────────────────────────────────────────────────────
export function LoadingIndicators({ isLoading, isTTSLoading, messages }: {
  isLoading: boolean;
  isTTSLoading: boolean;
  messages: ChatMessage[];
}) {
  const [ttsElapsed, setTtsElapsed] = useState(0);
  useEffect(() => {
    if (!isTTSLoading) { setTtsElapsed(0); return; }
    const t = setInterval(() => setTtsElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isTTSLoading]);

  return (
    <>
      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex items-end gap-2 animate-msg-in">
          <div className="w-6 h-6 rounded-full cyber-glass border border-neon-purple flex items-center justify-center shrink-0 pulse-neon">
            <Bot className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="cyber-glass border border-neon-purple rounded-2xl rounded-bl-sm px-4 py-3 loading-bar">
            <div className="flex flex-col gap-1">
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce neon-glow-purple" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground/50">Asisten sedang mengetik…</span>
            </div>
          </div>
        </div>
      )}
      {isTTSLoading && (
        <div className="flex items-end gap-2 animate-msg-in">
          <div className="w-6 h-6 rounded-full cyber-glass border border-neon-purple flex items-center justify-center shrink-0 pulse-neon">
            <Bot className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="cyber-glass border border-neon-purple rounded-2xl rounded-bl-sm px-3.5 py-2 flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse neon-glow-purple" />
              <span className="text-xs text-muted-foreground">Generating speech…</span>
              {ttsElapsed > 0 && (
                <span className="text-[10px] text-muted-foreground/40 tabular-nums">{ttsElapsed}s</span>
              )}
            </div>
            {ttsElapsed >= 3 && (
              <span className="text-[10px] text-muted-foreground/40">~5-15 detik untuk suara anime</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Message list ──────────────────────────────────────────────────────────────
interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isTTSLoading: boolean;
  onSendPrompt: (text: string) => void;
  onRegenerate: () => void;
  onReplay?: (text: string) => void;
  searchQuery?: string;
}

export function ChatMessageList({
  messages,
  isLoading,
  isTTSLoading,
  onSendPrompt,
  onRegenerate,
  onReplay,
  searchQuery,
}: ChatMessageListProps) {
  return (
    <div className="space-y-3 px-1">
      {messages.length === 0 && !searchQuery && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/70">Mulai percakapan</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tanya apa saja ke asisten virtual</p>
          </div>
          {/* Starter prompts */}
          <div className="w-full space-y-1.5 mt-1">
            {[
              'Halo! Perkenalkan dirimu dong 😊',
              'Ceritakan sesuatu yang menarik!',
              'Apa yang bisa kamu lakukan?',
              'Temani aku ngobrol santai yuk~',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSendPrompt(prompt)}
                disabled={isLoading}
                className="w-full text-left text-xs px-3 py-2 rounded-xl border border-border/40 bg-secondary/20 hover:bg-primary/8 hover:border-primary/30 text-foreground/60 hover:text-foreground/90 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.length === 0 && searchQuery && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">Tidak ada pesan yang cocok dengan "<span className="text-primary">{searchQuery}</span>"</p>
        </div>
      )}
      {messages.map((msg, i) => <MessageBubble key={i} msg={msg} onReplay={onReplay} searchQuery={searchQuery} />)}
      <LoadingIndicators isLoading={isLoading} isTTSLoading={isTTSLoading} messages={messages} />
      {/* Regenerate button */}
      {!isLoading && !isTTSLoading && messages.length >= 2 && messages[messages.length - 1]?.role === 'assistant' && (
        <div className="flex justify-start pl-8">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 px-2 rounded-lg hover:bg-secondary/40"
          >
            <RefreshCw className="w-3 h-3" /> Regenerasi
          </button>
        </div>
      )}
    </div>
  );
}
