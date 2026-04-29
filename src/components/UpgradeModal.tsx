/**
 * UpgradeModal — shown when a free user tries to access a Pro feature.
 * Displays what they're missing and a clear CTA to upgrade.
 */

import { useNavigate } from 'react-router-dom';
import { Crown, Check, X, Sparkles, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Feature name that triggered the modal */
  featureName?: string;
  /** Optional description of what the feature does */
  featureDescription?: string;
  /** Reason shown at the top (e.g. "Batas pesan bulanan tercapai") */
  reason?: string;
}

const PRO_HIGHLIGHTS = [
  '10.000 pesan / bulan',
  'ElevenLabs TTS premium',
  'VITS Anime TTS',
  'Upload background custom',
  'Upload model VRM sendiri',
  'AI Enhance Persona',
  'Semua animasi & ekspresi',
];

export default function UpgradeModal({
  open,
  onClose,
  featureName,
  featureDescription,
  reason,
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm w-full p-0 overflow-hidden border-0 rounded-2xl"
        style={{ background: 'linear-gradient(160deg, #1a1040 0%, #0e0b25 100%)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header gradient strip */}
        <div
          className="px-6 pt-8 pb-5 text-center"
          style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.2) 0%, transparent 100%)' }}
        >
          {/* Icon */}
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
            {reason ? (
              <Lock className="w-7 h-7 text-violet-400" />
            ) : (
              <Crown className="w-7 h-7 text-violet-300" />
            )}
          </div>

          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-black text-white text-center">
              {reason ?? (featureName ? `Fitur Pro: ${featureName}` : 'Upgrade ke Pro')}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 text-center leading-relaxed">
              {featureDescription ?? 'Buka semua fitur premium dan tingkatkan pengalaman AI-mu.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Pro highlights */}
        <div className="px-6 pb-2">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">
            Yang kamu dapatkan di Pro
          </p>
          <ul className="space-y-2">
            {PRO_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-xs text-white/70">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(139,92,246,0.2)' }}>
                  <Check className="w-2.5 h-2.5 text-violet-400" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Price + CTA */}
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div>
              <p className="text-xs text-white/50">Harga Pro</p>
              <p className="text-lg font-black text-white">Rp 79.000</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40">per bulan</p>
              <p className="text-[10px] text-violet-400 font-medium">Batalkan kapan saja</p>
            </div>
          </div>

          <Button
            onClick={handleUpgrade}
            className="w-full h-11 rounded-xl font-bold text-sm gap-2 border-0"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Lihat Paket Pro
          </Button>

          <button
            onClick={onClose}
            className="w-full text-xs text-white/30 hover:text-white/50 transition-colors py-1"
          >
            Lanjutkan dengan Starter
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Convenience hook ────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

interface UseUpgradeModalReturn {
  isOpen: boolean;
  featureName?: string;
  featureDescription?: string;
  reason?: string;
  openUpgradeModal: (opts?: { featureName?: string; featureDescription?: string; reason?: string }) => void;
  closeUpgradeModal: () => void;
  UpgradeModalElement: React.ReactElement;
}

export function useUpgradeModal(): UseUpgradeModalReturn {
  const [state, setState] = useState<{
    open: boolean;
    featureName?: string;
    featureDescription?: string;
    reason?: string;
  }>({ open: false });

  const openUpgradeModal = useCallback((opts?: {
    featureName?: string;
    featureDescription?: string;
    reason?: string;
  }) => {
    setState({ open: true, ...opts });
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const UpgradeModalElement = (
    <UpgradeModal
      open={state.open}
      onClose={closeUpgradeModal}
      featureName={state.featureName}
      featureDescription={state.featureDescription}
      reason={state.reason}
    />
  );

  return {
    isOpen: state.open,
    featureName: state.featureName,
    featureDescription: state.featureDescription,
    reason: state.reason,
    openUpgradeModal,
    closeUpgradeModal,
    UpgradeModalElement,
  };
}
