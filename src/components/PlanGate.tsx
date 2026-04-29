/**
 * PlanGate — Wraps any UI element that requires a Pro plan.
 *
 * Usage:
 *   <PlanGate feature="elevenLabsTTS" featureName="ElevenLabs TTS">
 *     <ElevenLabsSettings />
 *   </PlanGate>
 *
 * When the user is on free plan:
 * - Children are rendered with a visual overlay + lock icon
 * - Clicking triggers the UpgradeModal
 *
 * Set `blockRender` to completely hide children instead of overlaying.
 */

import { ReactNode, useState } from 'react';
import { Lock, Crown } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';
import UpgradeModal from './UpgradeModal';
import type { PlanLimits } from '@/lib/plan-config';

interface PlanGateProps {
  /** The feature key from PlanLimits to check */
  feature: keyof PlanLimits;
  /** Human-readable feature name for the upgrade modal */
  featureName?: string;
  /** Description shown in the upgrade modal */
  featureDescription?: string;
  /** If true, completely hides children instead of overlaying */
  blockRender?: boolean;
  /** Custom fallback element instead of the default locked overlay */
  fallback?: ReactNode;
  children: ReactNode;
}

export default function PlanGate({
  feature,
  featureName,
  featureDescription,
  blockRender = false,
  fallback,
  children,
}: PlanGateProps) {
  const { hasFeature, isPro, isAdmin } = usePlan();
  const [showModal, setShowModal] = useState(false);

  const allowed = hasFeature(feature);

  if (allowed) return <>{children}</>;

  if (blockRender) {
    if (fallback) return <>{fallback}</>;
    return (
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
        style={{
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.25)',
          color: 'rgba(192,168,255,0.7)',
        }}
      >
        <Crown className="w-3.5 h-3.5 text-violet-400" />
        {featureName ?? 'Fitur Pro'} — Upgrade
        <UpgradeModal
          open={showModal}
          onClose={() => setShowModal(false)}
          featureName={featureName}
          featureDescription={featureDescription}
        />
      </button>
    );
  }

  // Overlay mode — render children but block interaction
  return (
    <>
      <div className="relative group">
        {/* Blurred / dimmed children */}
        <div className="pointer-events-none select-none opacity-40 blur-[1px]">
          {children}
        </div>

        {/* Lock overlay */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl transition-all"
          style={{ background: 'rgba(7,7,15,0.6)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}
          >
            <Lock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white/90">
              {featureName ?? 'Fitur Pro'}
            </p>
            <p className="text-[10px] text-violet-400 font-medium mt-0.5">
              Upgrade untuk akses
            </p>
          </div>
        </button>
      </div>

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        featureName={featureName}
        featureDescription={featureDescription}
      />
    </>
  );
}

// ─── Inline Pro Badge ─────────────────────────────────────────────────────────

/** Small inline badge to mark Pro-only features in lists/settings */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 ${className ?? ''}`}
      style={{
        background: 'rgba(139,92,246,0.2)',
        border: '1px solid rgba(139,92,246,0.4)',
        color: '#c084fc',
      }}
    >
      <Crown className="w-2 h-2" />
      Pro
    </span>
  );
}
