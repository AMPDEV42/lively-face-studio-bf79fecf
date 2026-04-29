/**
 * SaaS Plan Configuration
 * Defines limits and features for each plan tier.
 */

export type PlanId = 'free' | 'pro' | 'business' | 'enterprise';

export interface PlanLimits {
  /** Max messages per month (null = unlimited) */
  messagesPerMonth: number | null;
  /** Max tokens per month (null = unlimited) */
  tokensPerMonth: number | null;
  /** Max virtual assistants */
  maxAssistants: number | null;
  /** Max custom VRM uploads */
  maxVrmUploads: number;
  /** Max custom VRMA animation uploads */
  maxVrmaUploads: number;
  /** Max custom background uploads */
  maxBackgroundUploads: number;
  /** Max conversation history stored */
  maxConversations: number;
  /** Can use ElevenLabs TTS */
  elevenLabsTTS: boolean;
  /** Can use VITS Anime TTS */
  vitsTTS: boolean;
  /** Can upload custom backgrounds */
  customBackgrounds: boolean;
  /** Can use AI Enhance Persona */
  aiEnhancePersona: boolean;
  /** Can access analytics */
  analytics: boolean | 'basic' | 'full';
  /** Priority support */
  prioritySupport: boolean;
  /** Custom API integration */
  customApi: boolean;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  limits: PlanLimits;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Starter',
    price: 'Gratis',
    period: '',
    limits: {
      messagesPerMonth: 100,
      tokensPerMonth: 50_000,
      maxAssistants: 1,
      maxVrmUploads: 0,
      maxVrmaUploads: 0,
      maxBackgroundUploads: 0,
      maxConversations: 10,
      elevenLabsTTS: false,
      vitsTTS: true,
      customBackgrounds: false,
      aiEnhancePersona: false,
      analytics: false,
      prioritySupport: false,
      customApi: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 'Rp 79.000',
    period: '/ bulan',
    limits: {
      messagesPerMonth: 10_000,
      tokensPerMonth: 5_000_000,
      maxAssistants: 1,
      maxVrmUploads: 5,
      maxVrmaUploads: 20,
      maxBackgroundUploads: 10,
      maxConversations: 100,
      elevenLabsTTS: true,
      vitsTTS: true,
      customBackgrounds: true,
      aiEnhancePersona: true,
      analytics: 'basic',
      prioritySupport: false,
      customApi: false,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 'Rp 299.000',
    period: '/ bulan',
    limits: {
      messagesPerMonth: 50_000,
      tokensPerMonth: 25_000_000,
      maxAssistants: 3,
      maxVrmUploads: 20,
      maxVrmaUploads: 100,
      maxBackgroundUploads: 50,
      maxConversations: 500,
      elevenLabsTTS: true,
      vitsTTS: true,
      customBackgrounds: true,
      aiEnhancePersona: true,
      analytics: 'full',
      prioritySupport: true,
      customApi: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    limits: {
      messagesPerMonth: null,
      tokensPerMonth: null,
      maxAssistants: null,
      maxVrmUploads: 999,
      maxVrmaUploads: 999,
      maxBackgroundUploads: 999,
      maxConversations: 9999,
      elevenLabsTTS: true,
      vitsTTS: true,
      customBackgrounds: true,
      aiEnhancePersona: true,
      analytics: 'full',
      prioritySupport: true,
      customApi: true,
    },
  },
};

/** Get plan config by role string */
export function getPlanConfig(isPro: boolean, isAdmin: boolean): PlanConfig {
  if (isAdmin) return PLAN_CONFIGS.enterprise;
  if (isPro) return PLAN_CONFIGS.pro;
  return PLAN_CONFIGS.free;
}

/** Format number with Indonesian locale */
export function formatNumber(n: number | null): string {
  if (n === null) return '∞';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('id-ID');
}

/** Get percentage used (0-100), capped at 100 */
export function getUsagePercent(used: number, limit: number | null): number {
  if (limit === null) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

/** Get color class based on usage percentage */
export function getUsageColor(percent: number): string {
  if (percent >= 90) return 'text-red-400';
  if (percent >= 70) return 'text-amber-400';
  return 'text-violet-400';
}

/** Get progress bar color based on usage percentage */
export function getProgressColor(percent: number): string {
  if (percent >= 90) return 'from-red-600 to-red-500';
  if (percent >= 70) return 'from-amber-600 to-amber-400';
  return 'from-violet-600 to-purple-500';
}
