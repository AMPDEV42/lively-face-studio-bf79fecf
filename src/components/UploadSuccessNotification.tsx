import { useEffect, useState } from 'react';
import { CheckCircle2, X, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UploadSuccessNotificationProps {
  modelName: string;
  onClose: () => void;
  onActivate?: () => void;
}

export default function UploadSuccessNotification({
  modelName,
  onClose,
  onActivate,
}: UploadSuccessNotificationProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss after 8s
    const dismiss = setTimeout(() => handleClose(), 8000);
    return () => { clearTimeout(t); clearTimeout(dismiss); };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-[200] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0 -translate-x-1/2' : 'opacity-0 translate-y-4 -translate-x-1/2'
      }`}
      style={{ width: 'min(calc(100vw - 2rem), 380px)' }}
    >
      <div
        className="rounded-2xl border border-violet-500/40 p-4 flex items-start gap-3 shadow-2xl shadow-black/60"
        style={{ background: 'rgba(10,8,24,0.97)', backdropFilter: 'blur(24px)' }}
      >
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-violet-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Model berhasil diupload!</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Cpu className="w-3 h-3 text-violet-400 shrink-0" />
            <p className="text-xs text-white/60 truncate">{modelName}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {onActivate && (
              <button
                onClick={() => { onActivate(); handleClose(); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
              >
                Aktifkan sekarang <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => { navigate('/settings'); handleClose(); }}
              className="text-xs text-white/40 hover:text-white/70 transition-colors ml-auto"
            >
              Lihat di Settings
            </button>
          </div>

          {/* Progress bar auto-dismiss */}
          <div className="mt-3 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-500/60 rounded-full"
              style={{ animation: 'shrink-bar 8s linear forwards' }}
            />
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
