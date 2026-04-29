/**
 * SaaS Plan Configuration
 * Voxie menggunakan model 2-tier sederhana: Starter (gratis) + Pro (berbayar).
 * User Pro yang kehabisan kuota bisa top-up paket pesan tambahan.
 *
 * KEBIJAKAN TOP-UP:
 * - Top-up hanya bisa dibeli saat Pro aktif
 * - Sisa top-up DIBEKUKAN (tidak bisa dipakai) saat non-Pro
 * - Sisa top-up AKTIF KEMBALI saat Pro aktif lagi (tidak hangus)
 * - Maksimum top-up tersimpan: MAX_TOPUP_MESSAGES (3.000 pesan)
 * - Ini mencegah akumulasi tak terbatas & menjaga margin tetap positif
 */

export type PlanId = 'free' | 'pro';

/**
 * Maksimum kuota top-up yang bisa dimiliki sekaligus (tidak termasuk kuota langganan).
 * Worst case biaya: (1.500 + 3.000) × Rp 25 = Rp 112.500 < Rp 150.000 revenue → margin positif.
 */
export const MAX_TOPUP_MESSAGES = 3_000;
export const MAX_TOPUP_TTS_CHARS = 100_000; // proporsional dengan MAX_TOPUP_MESSAGES

export interface PlanLimits {
  /** Max messages per month dari langganan (null = unlimited) */
  messagesPerMonth: number | null;
  /** Max tokens per month (null = unlimited) */
  tokensPerMonth: number | null;
  /** Max TTS characters per month (null = unlimited) */
  ttsCharsPerMonth: number | null;
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
  /** Can use OpenAI TTS premium */
  premiumTTS: boolean;
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

/**
 * Paket top-up pesan tambahan untuk user Pro yang kehabisan kuota.
 * Harga dirancang agar margin tetap positif per pesan.
 */
export interface TopUpPackage {
  id: string;
  label: string;
  messages: number;
  ttsChars: number;
  price: string;
  priceIDR: number;
  /** Harga per pesan dalam IDR (untuk transparansi) */
  perMessage: string;
  popular?: boolean;
}

export const TOP_UP_PACKAGES: TopUpPackage[] = [
  {
    id: 'topup_100',
    label: 'Mini',
    messages: 100,
    ttsChars: 3_000,
    price: 'Rp 15.000',
    priceIDR: 15_000,
    perMessage: 'Rp 150/pesan',
  },
  {
    id: 'topup_300',
    label: 'Standar',
    messages: 300,
    ttsChars: 10_000,
    price: 'Rp 29.000',
    priceIDR: 29_000,
    perMessage: 'Rp 97/pesan',
    popular: true,
  },
  {
    id: 'topup_700',
    label: 'Hemat',
    messages: 700,
    ttsChars: 25_000,
    price: 'Rp 49.000',
    priceIDR: 49_000,
    perMessage: 'Rp 70/pesan',
  },
  {
    id: 'topup_1500',
    label: 'Bulanan',
    messages: 1_500,
    ttsChars: 50_000,
    price: 'Rp 99.000',
    priceIDR: 99_000,
    perMessage: 'Rp 66/pesan',
  },
];

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Starter',
    price: 'Gratis',
    period: '',
    limits: {
      messagesPerMonth: 50,
      tokensPerMonth: 25_000,
      ttsCharsPerMonth: 0,       // Tidak ada premium TTS di free
      maxAssistants: 1,
      maxVrmUploads: 0,
      maxVrmaUploads: 0,
      maxBackgroundUploads: 0,
      maxConversations: 10,
      premiumTTS: false,
      vitsTTS: true,             // VITS anime gratis untuk semua
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
    price: 'Rp 150.000',
    period: '/ bulan',
    limits: {
      messagesPerMonth: 1_500,   // Break-even aman bahkan worst case full TTS
      tokensPerMonth: 750_000,
      ttsCharsPerMonth: 50_000,  // ~500 pesan TTS/bulan (100 chars avg)
      maxAssistants: 1,
      maxVrmUploads: 5,
      maxVrmaUploads: 20,
      maxBackgroundUploads: 10,
      maxConversations: 100,
      premiumTTS: true,
      vitsTTS: true,
      customBackgrounds: true,
      aiEnhancePersona: true,
      analytics: 'basic',
      prioritySupport: false,
      customApi: false,
    },
  },
};

/** Get plan config by role */
export function getPlanConfig(isPro: boolean, isAdmin: boolean): PlanConfig {
  // Admin tetap dapat akses penuh seperti Pro
  if (isAdmin || isPro) return PLAN_CONFIGS.pro;
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
