/**
 * usePlan — Central SaaS plan & usage tracking hook.
 *
 * Tracks:
 * - Current plan (free / pro / admin)
 * - Monthly message count
 * - Monthly token count
 * - Per-resource upload counts
 *
 * Usage is stored in localStorage keyed by userId + month.
 * This is a frontend-only implementation; backend enforcement
 * should be added via Supabase RLS / Edge Functions later.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUserRole } from './useUserRole';
import { useAuth } from './useAuth';
import {
  getPlanConfig,
  getUsagePercent,
  type PlanConfig,
  type PlanId,
} from '@/lib/plan-config';

export interface UsageStats {
  messagesThisMonth: number;
  tokensThisMonth: number;
  vrmUploads: number;
  vrmaUploads: number;
  backgroundUploads: number;
}

interface StoredUsage {
  month: string; // "YYYY-MM"
  messages: number;
  tokens: number;
  vrmUploads: number;
  vrmaUploads: number;
  backgroundUploads: number;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function storageKey(userId: string): string {
  return `voxie_usage_${userId}`;
}

function loadUsage(userId: string): StoredUsage {
  const month = getCurrentMonth();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed: StoredUsage = JSON.parse(raw);
      // Reset if new month
      if (parsed.month === month) return parsed;
    }
  } catch { /* ok */ }
  return { month, messages: 0, tokens: 0, vrmUploads: 0, vrmaUploads: 0, backgroundUploads: 0 };
}

function saveUsage(userId: string, usage: StoredUsage) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(usage));
  } catch { /* ok */ }
}

export function usePlan() {
  const { user } = useAuth();
  const { isPro, isAdmin, loading: roleLoading } = useUserRole();

  const planConfig: PlanConfig = useMemo(
    () => getPlanConfig(isPro, isAdmin),
    [isPro, isAdmin]
  );

  const planId: PlanId = isAdmin ? 'enterprise' : isPro ? 'pro' : 'free';

  const [usage, setUsage] = useState<StoredUsage>(() => {
    if (!user) return { month: getCurrentMonth(), messages: 0, tokens: 0, vrmUploads: 0, vrmaUploads: 0, backgroundUploads: 0 };
    return loadUsage(user.id);
  });

  // Reload usage when user changes
  useEffect(() => {
    if (user) {
      setUsage(loadUsage(user.id));
    } else {
      setUsage({ month: getCurrentMonth(), messages: 0, tokens: 0, vrmUploads: 0, vrmaUploads: 0, backgroundUploads: 0 });
    }
  }, [user]);

  const persist = useCallback((next: StoredUsage) => {
    if (!user) return;
    saveUsage(user.id, next);
    setUsage(next);
  }, [user]);

  /** Record a message + token usage. Returns false if limit exceeded. */
  const recordMessage = useCallback((tokenCount: number = 0): boolean => {
    const { messagesPerMonth, tokensPerMonth } = planConfig.limits;
    const current = user ? loadUsage(user.id) : usage;

    // Check message limit
    if (messagesPerMonth !== null && current.messages >= messagesPerMonth) return false;
    // Check token limit
    if (tokensPerMonth !== null && current.tokens + tokenCount > tokensPerMonth) return false;

    const next: StoredUsage = {
      ...current,
      messages: current.messages + 1,
      tokens: current.tokens + tokenCount,
    };
    persist(next);
    return true;
  }, [planConfig.limits, usage, user, persist]);

  /** Check if user can send another message (without recording) */
  const canSendMessage = useCallback((): boolean => {
    const { messagesPerMonth, tokensPerMonth } = planConfig.limits;
    const current = user ? loadUsage(user.id) : usage;
    if (messagesPerMonth !== null && current.messages >= messagesPerMonth) return false;
    if (tokensPerMonth !== null && current.tokens >= tokensPerMonth) return false;
    return true;
  }, [planConfig.limits, usage, user]);

  /** Record a VRM upload. Returns false if limit exceeded. */
  const recordVrmUpload = useCallback((): boolean => {
    const current = user ? loadUsage(user.id) : usage;
    if (current.vrmUploads >= planConfig.limits.maxVrmUploads) return false;
    persist({ ...current, vrmUploads: current.vrmUploads + 1 });
    return true;
  }, [planConfig.limits.maxVrmUploads, usage, user, persist]);

  /** Record a VRMA upload. Returns false if limit exceeded. */
  const recordVrmaUpload = useCallback((): boolean => {
    const current = user ? loadUsage(user.id) : usage;
    if (current.vrmaUploads >= planConfig.limits.maxVrmaUploads) return false;
    persist({ ...current, vrmaUploads: current.vrmaUploads + 1 });
    return true;
  }, [planConfig.limits.maxVrmaUploads, usage, user, persist]);

  /** Record a background upload. Returns false if limit exceeded. */
  const recordBackgroundUpload = useCallback((): boolean => {
    const current = user ? loadUsage(user.id) : usage;
    if (current.backgroundUploads >= planConfig.limits.maxBackgroundUploads) return false;
    persist({ ...current, backgroundUploads: current.backgroundUploads + 1 });
    return true;
  }, [planConfig.limits.maxBackgroundUploads, usage, user, persist]);

  /** Check if a specific feature is available on current plan */
  const hasFeature = useCallback((feature: keyof typeof planConfig.limits): boolean => {
    const val = planConfig.limits[feature];
    if (typeof val === 'boolean') return val;
    if (val === null) return true; // unlimited
    if (typeof val === 'number') return val > 0;
    if (val === 'basic' || val === 'full') return true;
    return false;
  }, [planConfig.limits]);

  // Computed usage percentages
  const messagePercent = getUsagePercent(usage.messages, planConfig.limits.messagesPerMonth);
  const tokenPercent = getUsagePercent(usage.tokens, planConfig.limits.tokensPerMonth);

  const stats: UsageStats = {
    messagesThisMonth: usage.messages,
    tokensThisMonth: usage.tokens,
    vrmUploads: usage.vrmUploads,
    vrmaUploads: usage.vrmaUploads,
    backgroundUploads: usage.backgroundUploads,
  };

  return {
    planId,
    planConfig,
    isPro,
    isAdmin,
    loading: roleLoading,
    stats,
    usage,
    messagePercent,
    tokenPercent,
    recordMessage,
    canSendMessage,
    recordVrmUpload,
    recordVrmaUpload,
    recordBackgroundUpload,
    hasFeature,
  };
}
