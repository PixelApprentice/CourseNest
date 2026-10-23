/**
 * Audible Suite for CourseNest
 *
 * Provides:
 *  1. Text-to-Speech (TTS) Narration Engine (Web Speech API) with sentence chunking,
 *     markdown cleanup, speed controls, voice selection, and state tracking.
 *  2. Interactive Audio Cues & Chimes (Pure Web Audio API Synthesizer) with zero external assets:
 *     - Lesson completion celebration chord
 *     - Quiz success fanfare
 *     - Bookmark & note saving tactile audio clicks
 */

import { useState, useEffect, useCallback } from 'react';

export interface AudibleVoice {
  name: string;
  lang: string;
  voiceURI: string;
  isDefault: boolean;
}

export interface AudibleOptions {
  rate?: number; // 0.5 to 2.0
  pitch?: number; // 0.8 to 1.2
  voiceURI?: string;
  onBoundary?: (charIndex: number, sentenceText: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

let activeUtterances: SpeechSynthesisUtterance[] = [];
let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContextInstance) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextInstance = new AudioCtx();
      }
    } catch {
      return null;
    }
  }
  if (audioContextInstance && audioContextInstance.state === 'suspended') {
    audioContextInstance.resume().catch(() => {});
  }
  return audioContextInstance;
}

/**
 * Strips markdown symbols, code block fences, and URLs for natural voice pronunciation.
 */
export function cleanTextForSpeech(rawMarkdown: string): string {
  if (!rawMarkdown) return '';
  return rawMarkdown
    // Remove code block markers but keep spoken hints
    .replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, 'Code block: $1')
    .replace(/`([^`]+)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove headings #, ##, etc.
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italics
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove blockquotes >
    .replace(/^>\s+/gm, '')
    // Standardize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into natural sentence fragments to prevent browser speech synthesis timeouts.
 */
function splitIntoSentences(text: string): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];
  // Split on punctuation followed by space
  const rawSentences = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [cleaned];
  return rawSentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Returns available system voices from the Web Speech API.
 */
export function getSystemVoices(): AudibleVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.map((v) => ({
    name: v.name,
    lang: v.lang,
    voiceURI: v.voiceURI,
    isDefault: v.default,
  }));
}

/**
 * Main Text-to-Speech Dispatcher
 */
export function speakNarration(text: string, options: AudibleOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('Web Speech API is not supported in this browser.'));
    return;
  }

  // Cancel any ongoing speech
  stopNarration();

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return;

  const rate = options.rate ?? 1.0;
  const pitch = options.pitch ?? 1.0;
  const allVoices = window.speechSynthesis.getVoices();
  const selectedVoice = options.voiceURI
    ? allVoices.find((v) => v.voiceURI === options.voiceURI)
    : allVoices.find((v) => v.lang.startsWith('en')) || allVoices[0];

  activeUtterances = sentences.map((sentence, idx) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));
    utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));
    if (selectedVoice) utterance.voice = selectedVoice;

    if (idx === 0) {
      utterance.onstart = () => {
        options.onStart?.();
        window.dispatchEvent(new CustomEvent('coursenest_audible_state', { detail: { isSpeaking: true, isPaused: false } }));
      };
    }

    if (idx === sentences.length - 1) {
      utterance.onend = () => {
        activeUtterances = [];
        options.onEnd?.();
        window.dispatchEvent(new CustomEvent('coursenest_audible_state', { detail: { isSpeaking: false, isPaused: false } }));
      };
    }

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        options.onError?.(e);
      }
      activeUtterances = [];
      window.dispatchEvent(new CustomEvent('coursenest_audible_state', { detail: { isSpeaking: false, isPaused: false } }));
    };

    return utterance;
  });

  // Dispatch utterances sequentially
  activeUtterances.forEach((u) => window.speechSynthesis.speak(u));
}

export function pauseNarration(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.pause();
    window.dispatchEvent(new CustomEvent('coursenest_audible_state', { detail: { isSpeaking: true, isPaused: true } }));
  }
}

export function resumeNarration(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.resume();
    window.dispatchEvent(new CustomEvent('coursenest_audible_state', { detail: { isSpeaking: true, isPaused: false } }));
  }
}

export function stopNarration(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    activeUtterances = [];
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent('coursenest_audible_state', { detail: { isSpeaking: false, isPaused: false } }));
  }
}

/**
 * 2. Pure Web Audio API Sound Synthesizer (Instant Offline Cues)
 */
export function playAudibleChime(type: 'complete' | 'success' | 'click' | 'bookmark'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'complete') {
    // Majestic 4-note ascending major chord arpeggio (C5 - E5 - G5 - C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.65);
    });
  } else if (type === 'success') {
    // Upbeat duo-tone (E5 -> G#5)
    [659.25, 830.61].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  } else if (type === 'bookmark') {
    // Warm gentle bell chord (F5 - A5)
    [698.46, 880.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    });
  } else if (type === 'click') {
    // Subtle physical tactile tap (low pop)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

/**
 * React Hook for Audible Narration & Audio Controls
 */
export function useAudible() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [voices, setVoices] = useState<AudibleVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const v = getSystemVoices();
      setVoices(v);
      if (v.length > 0 && !selectedVoiceURI) {
        const defaultVoice = v.find((voice) => voice.lang.startsWith('en')) || v[0];
        if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const handleStateChange = (e: any) => {
      if (e.detail) {
        setIsSpeaking(Boolean(e.detail.isSpeaking));
        setIsPaused(Boolean(e.detail.isPaused));
      }
    };

    window.addEventListener('coursenest_audible_state', handleStateChange);
    return () => {
      window.removeEventListener('coursenest_audible_state', handleStateChange);
    };
  }, [selectedVoiceURI]);

  const speak = useCallback(
    (text: string) => {
      speakNarration(text, {
        rate,
        voiceURI: selectedVoiceURI,
        onStart: () => {
          setIsSpeaking(true);
          setIsPaused(false);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onError: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
      });
    },
    [rate, selectedVoiceURI],
  );

  const pause = useCallback(() => {
    pauseNarration();
  }, []);

  const resume = useCallback(() => {
    resumeNarration();
  }, []);

  const stop = useCallback(() => {
    stopNarration();
  }, []);

  const playChime = useCallback((type: 'complete' | 'success' | 'click' | 'bookmark') => {
    playAudibleChime(type);
  }, []);

  return {
    isSpeaking,
    isPaused,
    rate,
    setRate,
    selectedVoiceURI,
    setSelectedVoiceURI,
    voices,
    speak,
    pause,
    resume,
    stop,
    playChime,
  };
}
