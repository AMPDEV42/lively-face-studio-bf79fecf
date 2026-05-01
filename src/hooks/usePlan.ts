/**
 * usePlan — Central SaaS plan & usage tracking hook.
 *
 * Source of truth:
 * - Role: `user_roles` table (server)
 * - Monthly counters (messages, tts_chars, topUp): `usage_log` table (server)
 * - Upload counts: derived from real tables when needed; trigger enforces hard limit
 *
 * Client cannot bypass quotas — edge functions verify before serving requests
 * and DB triggers reject inserts that exceed plan limits.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUserRole } from './useUserRole';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  getPlanConfig,
  getUsagePercent,
  MAX_TOPUP_MESSAGES,
  type PlanConfig,
  type PlanId,
} from '@/lib/plan-config';

export interface UsageStats {
  messagesThisMonth: number;
  tokensThisMonth: number;
  ttsCharsThisMonth: number;
  topUpMessages: number;
  topUpTtsChars: number;
  vrmUploads: number;
  vrmaUploads: number;
  backgroundUploads: number;
  totalMessageQuota: number | null;
  topUpHeadroom: number;
}

interface UsageRow {
  messages_count: number;
  tokens_count: number;
  tts_chars_count: number;
  topup_messages: number;
  topup_tts_chars: number;
}

const EMPTY_USAGE: UsageRow = {
  messages_count: 0,
  tokens_count: 0,
  tts_chars_count: 0,
  topup_messages: 0,
  topup_tts_chars: 0,
};

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function usePlan() {
  const { user } = useAuth();
  const { isPro, isAdmin, loading: roleLoading } = useUserRole();

  const planConfig: PlanConfig = useMemo(
    () => getPlanConfig(isPro, isAdmin),
    [isPro, isAdmin]
  );

  const planId: PlanId = (isAdmin || isPro) ? 'pro' : 'free';

  const [usage, setUsage] = useState<UsageRow>(EMPTY_USAGE);
  const [vrmUploads, setVrmUploads] = useState(0);
  const [vrmaUploads, setVrmaUploads] = useState(0);

  // Fetch usage row + upload counts whenever user changes
  const refreshUsage = useCallback(async () => {
    if (!user) {
      setUsage(EMPTY_USAGE);
      setVrmUploads(0);
      setVrmaUploads(0);
      return;
    }
    const period = currentPeriod();
    const [{ data: u }, { count: vrmCount }, { count: vrmaCount }] = await Promise.all([
      supabase
        .from('usage_log')
        .select('messages_count, tokens_count, tts_chars_count, topup_messages, topup_tts_chars')
        .eq('user_id', user.id)
        .eq('period', period)
        .maybeSingle(),
      supabase.from('vrm_models').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('vrma_animations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setUsage(u ?? EMPTY_USAGE);
    setVrmUploads(vrmCount ?? 0);
    setVrmaUploads(vrmaCount ?? 0);
  }, [user]);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  /** Check if user can send another message (server still re-checks) */
  const canSendMessage = useCallback((): boolean => {
    const { messagesPerMonth } = planConfig.limits;
    if (messagesPerMonth === null) return true;
    const effectiveTopUp = isPro ? usage.topup_messages : 0;
    return usage.messages_count < messagesPerMonth + effectiveTopUp;
  }, [planConfig.limits, isPro, usage]);

  /** Optimistic local increment (server is source of truth; refresh later) */
  const recordMessage = useCallback((_tokenCount: number = 0): boolean => {
    if (!canSendMessage()) return false;
    setUsage((prev) => ({ ...prev, messages_count: prev.messages_count + 1 }));
    // Refresh from DB shortly to reconcile (edge function increments authoritatively)
    setTimeout(() => { refreshUsage(); }, 1500);
    return true;
  }, [canSendMessage, refreshUsage]);

  const canUsePremiumTTS = useCallback((charCount: number = 0): boolean => {
    const { ttsCharsPerMonth, premiumTTS } = planConfig.limits;
    if (!premiumTTS) return false;
    if (ttsCharsPerMonth === null) return true;
    const effectiveTopUp = isPro ? usage.topup_tts_chars : 0;
    return usage.tts_chars_count + charCount <= ttsCharsPerMonth + effectiveTopUp;
  }, [planConfig.limits, isPro, usage]);

  const recordTtsChars = useCallback((charCount: number): boolean => {
    if (!canUsePremiumTTS(charCount)) return false;
    setUsage((prev) => ({ ...prev, tts_chars_count: prev.tts_chars_count + charCount }));
    setTimeout(() => { refreshUsage(); }, 1500);
    return true;
  }, [canUsePremiumTTS, refreshUsage]);

  /** Upload limits enforced by DB trigger; this is just for UI feedback */
  const recordVrmUpload = useCallback((): boolean => {
    if (vrmUploads >= planConfig.limits.maxVrmUploads) return false;
    setVrmUploads((n) => n + 1);
    return true;
  }, [planConfig.limits.maxVrmUploads, vrmUploads]);

  const recordVrmaUpload = useCallback((): boolean => {
    if (vrmaUploads >= planConfig.limits.maxVrmaUploads) return false;
    setVrmaUploads((n) => n + 1);
    return true;
  }, [planConfig.limits.maxVrmaUploads, vrmaUploads]);

  const recordBackgroundUpload = useCallback((): boolean => {
    return planConfig.limits.maxBackgroundUploads > 0;
  }, [planConfig.limits.maxBackgroundUploads]);

  /** Top-up application — server-side via webhook in future; stub returns not_pro for non-Pro */
  const applyTopUp = useCallback(async (
    _messages: number, _ttsChars: number,
  ): Promise<'ok' | 'not_pro' | 'cap_reached'> => {
    if (!isPro) return 'not_pro';
    // TODO: implement via secure RPC after payment webhook
    return 'ok';
  }, [isPro]);

  const canTopUp = useCallback((messages: number): boolean => {
    if (!isPro) return false;
    return usage.topup_messages + messages <= MAX_TOPUP_MESSAGES;
  }, [isPro, usage.topup_messages]);

  const hasFeature = useCallback((feature: keyof typeof planConfig.limits): boolean => {
    const val = planConfig.limits[feature];
    if (typeof val === 'boolean') return val;
    if (val === null) return true;
    if (typeof val === 'number') return val > 0;
    if (val === 'basic' || val === 'full') return true;
    return false;
  }, [planConfig.limits]);

  // Computed
  const effectiveTopUpMessages = isPro ? usage.topup_messages : 0;
  const effectiveTopUpTtsChars = isPro ? usage.topup_tts_chars : 0;

  const totalMessageQuota = planConfig.limits.messagesPerMonth !== null
    ? planConfig.limits.messagesPerMonth + effectiveTopUpMessages
    : null;
  const totalTtsQuota = planConfig.limits.ttsCharsPerMonth !== null
    ? planConfig.limits.ttsCharsPerMonth + effectiveTopUpTtsChars
    : null;

  const messagePercent = getUsagePercent(usage.messages_count, totalMessageQuota);
  const tokenPercent = getUsagePercent(usage.tokens_count, planConfig.limits.tokensPerMonth);
  const ttsPercent = getUsagePercent(usage.tts_chars_count, totalTtsQuota);

  const topUpHeadroom = Math.max(0, MAX_TOPUP_MESSAGES - usage.topup_messages);

  const stats: UsageStats = {
    messagesThisMonth: usage.messages_count,
    tokensThisMonth: usage.tokens_count,
    ttsCharsThisMonth: usage.tts_chars_count,
    topUpMessages: usage.topup_messages,
    topUpTtsChars: usage.topup_tts_chars,
    vrmUploads,
    vrmaUploads,
    backgroundUploads: 0,
    totalMessageQuota,
    topUpHeadroom,
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
    ttsPercent,
    refreshUsage,
    recordMessage,
    canSendMessage,
    recordTtsChars,
    canUsePremiumTTS,
    applyTopUp,
    canTopUp,
    recordVrmUpload,
    recordVrmaUpload,
    recordBackgroundUpload,
    hasFeature,
  };
}
