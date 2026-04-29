import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ChatPanel from '@/components/ChatPanel';
import UserMenu from '@/components/UserMenu';
import NewUserModelBanner from '@/components/NewUserModelBanner';
import CameraControls from '@/components/CameraControls';
import LightingControls from '@/components/LightingControls';
import BackgroundSelector from '@/components/BackgroundSelector';
import OnboardingGuide from '@/components/OnboardingGuide';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

import { useVrmaTriggers } from '@/hooks/useVrmaTriggers';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIdlePreset } from '@/hooks/useIdlePreset';
import { parseAnimTag, isWebSpeechUrl, getWebSpeechText } from '@/lib/chat-api';
import { speakWithWebSpeech, stopWebSpeech, preloadVoices } from '@/lib/web-speech-tts';
import { useTTSProvider } from '@/hooks/useTTSProvider';
import type { VrmViewerHandle, CameraPreset } from '@/components/VrmViewer';
import type { LangCode } from '@/lib/lang-detect';

const VrmViewer = lazy(() => import('@/components/VrmViewer'));

export default function Index() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isPro } = useUserRole();
  const { activeProvider, handleRateLimit } = useTTSProvider(isPro);
  const { idlePresetId, setIdlePreset } = useIdlePreset();

  // Preload Web Speech voices on mount
  useEffect(() => { preloadVoices(); }, []);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWebSpeechActive, setIsWebSpeechActive] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [modelUrl, setModelUrl] = useState('');
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [personality, setPersonality] = useState<string | undefined>(undefined);
  const [spokenMessage, setSpokenMessage] = useState<string>('');
  const [isCameraFree, setIsCameraFree] = useState(false);
  const [currentCameraPreset, setCurrentCameraPreset] = useState<CameraPreset>(
    () => (localStorage.getItem('vrm.cameraPreset') as CameraPreset) ?? 'medium-shot'
  );
  const [chatOpen, setChatOpen] = useState(() =>
    false // Always start closed for both desktop and mobile
  );
  const [hasUnread, setHasUnread] = useState(false);
  const lastInteractionTime = useRef(Date.now());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ambientEffect, setAmbientEffect] = useState<'none' | 'sakura' | 'rain' | 'snow' | 'leaves'>(() => 
    (localStorage.getItem('vrm.ambient') as any) || 'none'
  );
  const [showSubtitles, setShowSubtitles] = useState(() => 
    localStorage.getItem('vrm.showSubtitles') !== 'false'
  );

  const viewerRef = useRef<VrmViewerHandle>(null);

  const { connectAudioElement, getAudioLevel, getFrequencyData } = useAudioAnalyser();
  const { clips, findMatch, findClipByName } = useVrmaTriggers();
  const userLangPref =
    (typeof window !== 'undefined'
      ? (localStorage.getItem('vrm.lang') as LangCode | null)
      : null) || null;

  if (audioRef.current === null && typeof window !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsSpeaking(false);
    const onError = () => setIsSpeaking(false);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    setAudioEl(audio);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const [audioConnected, setAudioConnected] = useState(false);
  useEffect(() => {
    if (!audioConnected || !audioEl) return;
    try { connectAudioElement(audioEl); } catch (e) { console.warn('[Index] Audio connect:', e); }
  }, [audioConnected, audioEl, connectAudioElement]);

  useEffect(() => {
    let cancelled = false;
    const loadActive = async () => {
      const { data: activeModel } = await supabase
        .from('vrm_models')
        .select('file_path, personality')
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled) return;
      if (activeModel?.file_path) {
        const { data: urlData } = supabase.storage.from('vrm-models').getPublicUrl(activeModel.file_path);
        if (urlData?.publicUrl) setModelUrl(urlData.publicUrl);
        setPersonality(activeModel.personality || undefined);
      } else {
        setModelUrl('');
        setPersonality(undefined);
      }

      const { data: activeVoice } = await supabase
        .from('voice_settings')
        .select('voice_id')
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled) return;
      setVoiceId(activeVoice?.voice_id ?? undefined);

      // Load affection for initial greeting from Auth Metadata (safe optional chain)
      const metaAffection = user?.user_metadata?.affection ?? 0;
      const affection = typeof metaAffection === 'number' ? metaAffection : parseInt(metaAffection, 10);
      const level = Math.floor(affection / 100);
      
      let profileData: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        profileData = data;
      } catch (e) {
        console.warn('[Profile] Profile fetch error:', e);
      }

      if (cancelled) return;

      if (affection > 50) {
        toast.info(`Welcome back, ${profileData?.display_name || user.email?.split('@')[0]}!`, {
          description: level > 0 ? `Affection Level ${level} reached.` : 'Your companion has been waiting for you.',
          duration: 4000,
        });
      }
    };
    loadActive();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleAmbientChange = useCallback((effect: 'none' | 'sakura' | 'rain' | 'snow' | 'leaves') => {
    setAmbientEffect(effect);
    localStorage.setItem('vrm.ambient', effect);
  }, []);

  // Toggle ambient particles on/off (P shortcut)
  const handleToggleParticles = useCallback(() => {
    setAmbientEffect(prev => {
      if (prev === 'none') {
        // Restore last non-none effect, or default to sakura
        const last = (localStorage.getItem('vrm.ambient_last') as any) || 'sakura';
        localStorage.setItem('vrm.ambient', last);
        return last;
      } else {
        localStorage.setItem('vrm.ambient_last', prev);
        localStorage.setItem('vrm.ambient', 'none');
        return 'none';
      }
    });
  }, []);

  const handleToggleSubtitles = useCallback(() => {
    setShowSubtitles(prev => {
      const next = !prev;
      localStorage.setItem('vrm.showSubtitles', String(next));
      return next;
    });
  }, []);

  const handleEnvironmentChange = useCallback((preset: string) => {
    viewerRef.current?.setEnvironment(preset);
  }, []);

  const handleSpeakStart = useCallback(
    (audioUrl: string, messageText?: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!audioConnected) setAudioConnected(true);

      // Always stop both audio sources before starting a new one
      audio.pause();
      audio.src = '';
      stopWebSpeech();

      // Trigger animations regardless of audio source
      if (messageText) {
        setSpokenMessage(messageText);
        const { animName } = parseAnimTag(messageText);
        let triggered = false;
        if (animName) {
          const byName = findClipByName(animName);
          if (byName && viewerRef.current?.isVrmLoaded()) {
            viewerRef.current.playVrmaUrl(byName.url, { loop: false, fadeIn: 0.4 }).catch(console.warn);
            triggered = true;
          }
        }
        if (!triggered) {
          const match = findMatch(messageText, userLangPref);
          if (match && viewerRef.current?.isVrmLoaded()) {
            viewerRef.current.playVrmaUrl(match.url, { loop: false, fadeIn: 0.4 }).catch(console.warn);
          }
        }
      }

      if (isWebSpeechUrl(audioUrl)) {
        // Web Speech path — ElevenLabs is NOT used
        const text = getWebSpeechText(audioUrl);
        speakWithWebSpeech(text, {
          onStart: () => { setIsSpeaking(true); setIsWebSpeechActive(true); },
          onEnd:   () => { setIsSpeaking(false); setIsWebSpeechActive(false); },
          onError: () => { setIsSpeaking(false); setIsWebSpeechActive(false); },
        });
      } else {
        // ElevenLabs path — Web Speech is NOT used
        setIsWebSpeechActive(false);
        audio.src = audioUrl;
        setIsSpeaking(true);
        audio.play().catch((err) => {
          console.warn('[TTS] Autoplay blocked:', err);
          setIsSpeaking(false);
          // Autoplay policy — user interaction required
          if (err?.name === 'NotAllowedError') {
            toast.error('Klik layar dulu agar suara bisa diputar', { duration: 3000 });
          }
        });
      }
    },
    [findMatch, findClipByName, userLangPref, audioConnected],
  );

  const handleSpeakEnd = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = '';
    stopWebSpeech();
    setIsSpeaking(false);
    setIsWebSpeechActive(false);
  }, []);

  const handleUserMessage = useCallback(
    (text: string) => {
      // User interacted, ensures audio can play
      if (!audioConnected) setAudioConnected(true);
      lastInteractionTime.current = Date.now();
    },
    [audioConnected],
  );

  const handleCameraPresetChange = useCallback((preset: CameraPreset) => {
    setCurrentCameraPreset(preset);
    localStorage.setItem('vrm.cameraPreset', preset);
    viewerRef.current?.setCameraPreset(preset);
  }, []);

  const handleCameraFreeModeChange = useCallback((enabled: boolean) => {
    setIsCameraFree(enabled);
    viewerRef.current?.setCameraFree(enabled);
  }, []);

  const handleToggleChat = useCallback(() => {
    setChatOpen((v) => {
      if (!v) setHasUnread(false);
      return !v;
    });
    lastInteractionTime.current = Date.now();
  }, []);

  const handleLevelUp = useCallback((level: number) => {
    // Cari animasi kategori 'reaction' atau 'emote' yang bahagia
    const reactionClips = clips.filter(c => c.category === 'reaction' || c.category === 'emote');
    if (reactionClips.length > 0 && viewerRef.current?.isVrmLoaded()) {
      const randomClip = reactionClips[Math.floor(Math.random() * reactionClips.length)];
      const result = findClipByName(randomClip.name);
      if (result) {
        viewerRef.current.playVrmaUrl(result.url, { loop: false, fadeIn: 0.5 }).catch(console.warn);
      }
    }
  }, [clips, findClipByName]);

  // Deep Idle (Boredom V2) Implementation - Randomized
  const nextBoredomTrigger = useRef(60000 + Math.random() * 60000);
  useEffect(() => {
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastInteractionTime.current;
      if (idleTime > nextBoredomTrigger.current && !isSpeaking) {
        // Reset timer immediately to avoid spamming
        lastInteractionTime.current = Date.now();
        nextBoredomTrigger.current = 45000 + Math.random() * 90000;

        const idleClips = clips.filter(c => c.category === 'idle');
        if (idleClips.length > 0 && viewerRef.current?.isVrmLoaded()) {
          // Skip if a non-idle animation is already playing — avoid overlap
          if (viewerRef.current.isVrmaPlaying()) return;
          const randomIdle = idleClips[Math.floor(Math.random() * idleClips.length)];
          const result = findClipByName(randomIdle.name);
          if (result) {
            viewerRef.current.playVrmaUrl(result.url, { loop: false, fadeIn: 1.2 }).catch(() => {});
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [clips, isSpeaking, findClipByName]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onToggleChat: handleToggleChat,
    onEscape: () => { if (chatOpen) setChatOpen(false); },
    onCameraPreset: (preset) => handleCameraPresetChange(preset as CameraPreset),
    onToggleParticles: handleToggleParticles,
  });

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-background cyber-grid-animated flex">
      <NewUserModelBanner />
      <OnboardingGuide />
      <KeyboardShortcutsHelp />

      {/* Full-screen VRM Viewer Background Layer */}
      <div className="absolute inset-0 z-0">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin neon-glow-purple" />
            </div>
          }
        >
          <ErrorBoundary>
            <VrmViewer
              ref={viewerRef}
              modelUrl={modelUrl}
              isSpeaking={isSpeaking}
              isWebSpeechActive={isWebSpeechActive}
              audioElement={audioEl}
              currentMessage={spokenMessage}
              getAudioLevel={audioConnected ? getAudioLevel : undefined}
              getFrequencyData={audioConnected ? getFrequencyData : undefined}
              onLevelUp={handleLevelUp}
              ambientEffect={ambientEffect}
              showSubtitles={showSubtitles}
              clips={clips}
              userId={user?.id}
              className="w-full h-full"
            />
          </ErrorBoundary>
        </Suspense>
      </div>

      {/* Content Layer - VRM Viewer area (for controls only) */}
      <div className="flex-1 relative min-w-0 scanlines z-30 pointer-events-none">
        {/* Right-side vertical control column — all controls in one column */}
        <TooltipProvider delayDuration={600}>
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-40 pointer-events-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto scrollbar-none"
          style={{ scrollbarWidth: 'none' }}>
          <div className="flex flex-col gap-2 px-1 py-0.5">
          {/* User menu — identity, stands alone */}
          <UserMenu />

          {/* Divider */}
          <div className="h-px mx-1" style={{ background: 'rgba(168,85,247,0.25)' }} />

          {/* Chat + scene controls — one logical group */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleChat}
                className={`relative h-10 w-10 btn-overlay transition-all ${chatOpen ? 'active' : ''}`}
              >
                {chatOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {!chatOpen && hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background animate-pulse neon-glow-purple-strong" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="panel-overlay border-0 text-xs text-foreground/90">
              {chatOpen ? 'Tutup chat' : 'Buka chat'} <span className="opacity-40 ml-1">Ctrl+K</span>
            </TooltipContent>
          </Tooltip>

          {modelUrl && (
            <>
              <CameraControls
                onPresetChange={handleCameraPresetChange}
                onFreeModeChange={handleCameraFreeModeChange}
                isFreeMode={isCameraFree}
                currentPreset={currentCameraPreset}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <BackgroundSelector
                      onBackgroundChange={(imageUrl) => {
                        viewerRef.current?.setImageBackground(imageUrl);
                      }}
                      onEnvironmentChange={handleEnvironmentChange}
                      currentEnvironment={viewerRef.current?.getCurrentEnvironment() ?? 'cyberpunk-void'}
                      ambientEffect={ambientEffect}
                      onAmbientChange={handleAmbientChange}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="panel-overlay border-0 text-xs text-foreground/90">
                  Background & Environment
                </TooltipContent>
              </Tooltip>
              <LightingControls
                onLightingChange={(config) => viewerRef.current?.setLighting(config)}
                onExposureChange={(val) => viewerRef.current?.setExposure(val)}
                initialConfig={viewerRef.current?.getCurrentLighting() || undefined}
              />
            </>
          )}
          </div>
        </div>
        </TooltipProvider>

        {/* Top bar — app name only */}
        <div className="absolute top-0 left-0 right-0 flex items-center px-3 md:px-4 z-40 pointer-events-none"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            paddingBottom: '3rem',
            background: 'linear-gradient(to bottom, rgba(6,4,14,0.55) 0%, rgba(6,4,14,0.15) 70%, transparent 100%)'
          }}>
          <div className="flex items-center gap-2 pointer-events-auto">
            <img
              src="/app logo/voxie logo.png"
              alt="Voxie"
              className="h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]"
            />
          </div>
        </div>
      </div>

      {/* Chat panel - always mobile-style (overlay) for both desktop and mobile */}
      <ChatPanel
        onSpeakStart={handleSpeakStart}
        onSpeakEnd={handleSpeakEnd}
        onUserMessage={handleUserMessage}
        voiceId={voiceId}
        ttsProvider={activeProvider}
        onTTSRateLimit={handleRateLimit}
        isMobile={true} // Always use mobile layout
        isOpen={chatOpen}
        onToggle={handleToggleChat}
        onUnreadChange={setHasUnread}
        personality={personality}
        isSpeaking={isSpeaking}
        showSubtitles={showSubtitles}
        onToggleSubtitles={handleToggleSubtitles}
        availableAnimations={clips.map(c => c.name)}
      />
    </div>
  );
}
