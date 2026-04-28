import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings as SettingsIcon, User } from 'lucide-react';
import ModelManager from '@/components/ModelManager';
import LanguagePreference from '@/components/LanguagePreference';
import TTSSettings from '@/components/TTSSettings';
import InteractionSettings from '@/components/InteractionSettings';
import { useTTSProvider } from '@/hooks/useTTSProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface VrmModelRow {
  id: string;
  name: string;
  gender: string;
  personality: string;
  is_active: boolean;
  file_path: string;
  file_name: string;
}

interface VoiceRow {
  id: string;
  voice_id: string;
  voice_name: string;
  is_active: boolean;
  gender: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { isPro } = useUserRole();
  const { provider, rateLimited, setProvider } = useTTSProvider(isPro);
  const [models, setModels] = useState<VrmModelRow[]>([]);
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const { data, error } = await supabase
        .from('vrm_models')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setModels((data ?? []) as VrmModelRow[]);
    } catch (err) {
      toast.error('Gagal memuat model: ' + (err as Error).message);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const fetchVoices = useCallback(async () => {
    setLoadingVoices(true);
    try {
      const { data, error } = await supabase
        .from('voice_settings')
        .select('*')
        .order('voice_name');
      if (error) throw error;
      setVoices((data ?? []) as VoiceRow[]);
    } catch (err) {
      toast.error('Gagal memuat suara: ' + (err as Error).message);
    } finally {
      setLoadingVoices(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchVoices();
  }, [fetchModels, fetchVoices]);

  const activeModelGender = useMemo<'male' | 'female'>(() => {
    const active = models.find((m) => m.is_active);
    return active?.gender === 'male' ? 'male' : 'female';
  }, [models]);

  return (
    <div className="min-h-screen bg-background cyber-grid-animated scanlines">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-neon-purple cyber-glass-strong backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 hover-neon-glow"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-7 h-7 rounded-lg bg-secondary border border-neon-purple flex items-center justify-center neon-glow-purple">
              <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h1 className="text-base font-semibold text-foreground tracking-tight text-neon-purple">Pengaturan</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 hover-neon-glow"
          >
            <User className="w-3.5 h-3.5" /> Profil
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {loadingModels ? (
          <div className="space-y-3">
            <div className="h-4 w-32 rounded bg-secondary/60 animate-pulse" />
            <div className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
            <div className="h-20 rounded-xl bg-secondary/40 animate-pulse" />
          </div>
        ) : (
          <ModelManager models={models} onRefresh={fetchModels} />
        )}
        <div className="border-t border-neon-purple" />
        {loadingVoices ? (
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-secondary/60 animate-pulse" />
            <div className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
            <div className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
          </div>
        ) : (
          <TTSSettings
            isPro={isPro}
            provider={provider}
            rateLimited={rateLimited}
            onProviderChange={setProvider}
            activeModelGender={activeModelGender}
            voices={voices}
            onVoicesRefresh={fetchVoices}
          />
        )}
        <div className="border-t border-neon-purple" />
        <InteractionSettings />
        <div className="border-t border-neon-purple" />
        <LanguagePreference />
      </div>
    </div>
  );
}
