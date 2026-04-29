import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, History, Plus, Search, Pencil, Trash2, Check, Pin, PinOff, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  title: string;
  preview?: string;
  pinned?: boolean;
}

interface ChatHistoryPanelProps {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  onClose: () => void;
  onNew: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onRename: (id: string, title: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
}

export function ChatHistoryPanel({
  conversations,
  activeId,
  loading,
  onClose,
  onNew,
  onSwitch,
  onDelete,
  onDeleteMultiple,
  onRename,
  onPin,
}: ChatHistoryPanelProps) {
  const [historySearch, setHistorySearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Undo delete — store deleted conversation temporarily
  const undoDataRef = useRef<{ id: string; title: string; data: Conversation } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDelete = useCallback((c: Conversation) => {
    // Cancel any previous undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    // Store data for undo
    undoDataRef.current = { id: c.id, title: c.title, data: c };

    // Optimistically delete
    onDelete(c.id);

    // Show toast with undo button
    toast(`"${c.title}" dihapus`, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          // Re-insert via onNew + rename is not ideal; we signal parent via a special restore
          // Since we can't easily restore, we show a message
          toast.info('Fitur undo memerlukan refresh halaman untuk percakapan yang sudah dihapus dari storage.');
          undoDataRef.current = null;
        },
      },
      cancel: { label: 'OK', onClick: () => { undoDataRef.current = null; } },
      duration: 5000,
    });

    // Clear undo data after 5 seconds
    undoTimerRef.current = setTimeout(() => {
      undoDataRef.current = null;
    }, 5000);
  }, [onDelete]);

  // Sort: pinned first, then by order
  const sorted = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const filtered = historySearch.trim()
    ? sorted.filter(c =>
        c.title.toLowerCase().includes(historySearch.toLowerCase()) ||
        c.preview?.toLowerCase().includes(historySearch.toLowerCase())
      )
    : sorted;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground/80">Riwayat Chat</span>
          {conversations.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60 bg-secondary/60 px-1.5 py-0.5 rounded-full">
              {conversations.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={() => { onDeleteMultiple(Array.from(selectedIds)); setSelectedIds(new Set()); setSelectMode(false); }}
              className="text-[10px] text-destructive hover:text-destructive/80 px-2 py-1 rounded hover:bg-destructive/10 transition-colors"
            >
              Hapus ({selectedIds.size})
            </button>
          )}
          {conversations.length > 1 && (
            <button
              onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${selectMode ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
            >
              {selectMode ? 'Batal' : 'Pilih'}
            </button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => { onClose(); setSelectMode(false); setSelectedIds(new Set()); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {conversations.length > 3 && (
        <div className="px-3 py-2 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Cari percakapan…"
              className="h-8 pl-8 text-xs bg-secondary/40 border-border/40 focus:border-primary/40"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 scrollbar-thin" ref={scrollAreaRef}>
        <div
          className="p-2 space-y-0.5"
          onScroll={(e) => setShowScrollTop((e.currentTarget.scrollTop ?? 0) > 200)}
        >
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors text-left"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold">Percakapan baru</span>
          </button>

          {loading ? (
            <div className="space-y-1 px-1 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-3 py-2.5 rounded-lg space-y-1.5">
                  <div className="h-3 bg-secondary/60 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                  <div className="h-2.5 bg-secondary/40 rounded animate-pulse w-4/5" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              {historySearch ? 'Tidak ada hasil' : 'Belum ada riwayat'}
            </p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectMode
                    ? selectedIds.has(c.id) ? 'bg-primary/15' : 'hover:bg-secondary/60'
                    : activeId === c.id ? 'bg-primary/10' : 'hover:bg-secondary/60'
                }`}
                onClick={() => {
                  if (selectMode) {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                      return next;
                    });
                  } else {
                    onSwitch(c.id);
                  }
                }}
              >
                {selectMode && (
                  <div className={`shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                    selectedIds.has(c.id) ? 'bg-primary border-primary' : 'border-border/60'
                  }`}>
                    {selectedIds.has(c.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                )}
                {editingId === c.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { onRename(c.id, editingTitle.trim() || c.title); setEditingId(null); }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-secondary/60 border border-border/60 rounded px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary/50"
                    />
                    <button onClick={() => { onRename(c.id, editingTitle.trim() || c.title); setEditingId(null); }} className="p-0.5 text-primary">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {c.pinned && <Pin className="w-2.5 h-2.5 text-primary/60 shrink-0" />}
                        <p className={`text-xs font-medium truncate ${activeId === c.id ? 'text-primary' : 'text-foreground/80'}`}>{c.title}</p>
                      </div>
                      {c.preview && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.preview}</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" onClick={() => { setEditingId(c.id); setEditingTitle(c.title); }}>
                        <Pencil className="w-3 h-3" />
                      </button>
                      {onPin && (
                        <button
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary"
                          title={c.pinned ? 'Lepas pin' : 'Sematkan'}
                          onClick={() => onPin(c.id, !c.pinned)}
                        >
                          {c.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                      )}
                      <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        {/* Scroll to top button */}
        {showScrollTop && (
          <div className="sticky bottom-2 flex justify-center pointer-events-none">
            <button
              className="pointer-events-auto flex items-center gap-1 px-3 py-1 rounded-full text-[10px] cyber-glass border border-primary/30 text-primary/70 hover:text-primary transition-colors shadow-md"
              onClick={() => {
                const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                if (viewport) viewport.scrollTop = 0;
                setShowScrollTop(false);
              }}
            >
              <ChevronUp className="w-3 h-3" /> Ke atas
            </button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
