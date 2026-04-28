import { useRef, useCallback, useState } from 'react';

export interface AudioAnalyserControls {
  /** Connect an HTMLAudioElement or MediaStream to the analyser. Safe to call
   *  multiple times — will skip if the same element is already attached, and
   *  swap the source if a new element is passed in. */
  connectAudioElement: (audio: HTMLAudioElement) => void;
  connectMediaStream: (stream: MediaStream) => void;
  /** Read current normalized volume 0–1 */
  getAudioLevel: () => number;
  /** Read current frequency data */
  getFrequencyData: () => Uint8Array;
  /** Whether audio is currently being analysed */
  isActive: boolean;
  /** Disconnect and clean up */
  disconnect: () => void;
}

export function useAudioAnalyser(): AudioAnalyserControls {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  // Track which HTMLAudioElement (if any) is currently attached, because a
  // given audio element can only be passed to createMediaElementSource ONCE
  // per AudioContext lifetime.
  const attachedElementRef = useRef<HTMLAudioElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  const ensureContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
        if (import.meta.env.DEV) console.log('[useAudioAnalyser] AudioContext created, state:', audioContextRef.current.state);
      } catch (e) {
        console.error('[useAudioAnalyser] Failed to create AudioContext:', e);
        throw e;
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      if (import.meta.env.DEV) console.log('[useAudioAnalyser] Resuming suspended AudioContext...');
      audioContextRef.current.resume()
        .then(() => { if (import.meta.env.DEV) console.log('[useAudioAnalyser] AudioContext resumed successfully'); })
        .catch((e) => console.warn('[useAudioAnalyser] Failed to resume AudioContext:', e));
    }
    if (!analyserRef.current) {
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      if (import.meta.env.DEV) console.log('[useAudioAnalyser] AnalyserNode created');
    }
    return { ctx: audioContextRef.current, analyser: analyserRef.current };
  }, []);

  const connectAudioElement = useCallback((audio: HTMLAudioElement) => {
    if (attachedElementRef.current === audio && sourceRef.current) {
      if (audioContextRef.current?.state === 'suspended') {
        if (import.meta.env.DEV) console.log('[useAudioAnalyser] Resuming AudioContext for existing connection...');
        audioContextRef.current.resume().catch((e) => console.warn('[useAudioAnalyser] Resume failed:', e));
      }
      setIsActive(true);
      if (import.meta.env.DEV) console.log('[useAudioAnalyser] Audio element already connected, reusing connection');
      return;
    }

    try {
      const { ctx, analyser } = ensureContext();

      if (sourceRef.current) {
        if (import.meta.env.DEV) console.log('[useAudioAnalyser] Disconnecting previous source');
        try { sourceRef.current.disconnect(); } catch (_) { /* ignore */ }
        sourceRef.current = null;
      }

      if (import.meta.env.DEV) console.log('[useAudioAnalyser] Creating MediaElementSource for audio element');
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
      attachedElementRef.current = audio;
      setIsActive(true);
      if (import.meta.env.DEV) console.log('[useAudioAnalyser] ✓ Audio element connected successfully');
    } catch (err) {
      console.error('[useAudioAnalyser] createMediaElementSource failed:', err);
      setIsActive(false);
    }
  }, [ensureContext]);

  const connectMediaStream = useCallback((stream: MediaStream) => {
    const { ctx, analyser } = ensureContext();

    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) { /* ignore */ }
      sourceRef.current = null;
    }

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;
    attachedElementRef.current = null;
    setIsActive(true);
  }, [ensureContext]);

  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current || !dataArrayRef.current) return 0;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;
    return Math.min(average / 128, 1.0);
  }, []);

  const getFrequencyData = useCallback((): Uint8Array => {
    if (!analyserRef.current || !dataArrayRef.current) return new Uint8Array(0);
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    return dataArrayRef.current;
  }, []);

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) { /* ignore */ }
      sourceRef.current = null;
    }
    attachedElementRef.current = null;
    setIsActive(false);
  }, []);

  return { 
    connectAudioElement, 
    connectMediaStream, 
    getAudioLevel, 
    getFrequencyData, 
    isActive, 
    disconnect 
  };
}
