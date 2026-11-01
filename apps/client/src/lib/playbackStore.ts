import { useState, useEffect } from 'react';

export interface PlaybackMedia {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  src: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isOffscreen: boolean;
  isNavigatedAway: boolean;
  onTogglePlay?: () => void;
  onSeek?: (time: number) => void;
  onToggleMute?: () => void;
}

let currentPlayback: PlaybackMedia | null = null;
const listeners = new Set<(state: PlaybackMedia | null) => void>();

function notify() {
  listeners.forEach((fn) => fn(currentPlayback));
  try {
    window.dispatchEvent(
      new CustomEvent('coursenest_playback_changed', {
        detail: currentPlayback,
      })
    );
  } catch {}
}

export function getActivePlayback(): PlaybackMedia | null {
  return currentPlayback;
}

export function setActivePlayback(data: Partial<PlaybackMedia> | null): void {
  if (data === null) {
    currentPlayback = null;
  } else {
    currentPlayback = {
      courseId: data.courseId || currentPlayback?.courseId || '',
      courseTitle: data.courseTitle || currentPlayback?.courseTitle || 'Course',
      lessonId: data.lessonId || currentPlayback?.lessonId || '',
      lessonTitle: data.lessonTitle || currentPlayback?.lessonTitle || 'Lesson',
      src: data.src || currentPlayback?.src || '',
      isPlaying: data.isPlaying ?? currentPlayback?.isPlaying ?? false,
      currentTime: data.currentTime ?? currentPlayback?.currentTime ?? 0,
      duration: data.duration ?? currentPlayback?.duration ?? 0,
      isMuted: data.isMuted ?? currentPlayback?.isMuted ?? false,
      isOffscreen: data.isOffscreen ?? currentPlayback?.isOffscreen ?? false,
      isNavigatedAway: data.isNavigatedAway ?? currentPlayback?.isNavigatedAway ?? false,
      onTogglePlay: data.onTogglePlay || currentPlayback?.onTogglePlay,
      onSeek: data.onSeek || currentPlayback?.onSeek,
      onToggleMute: data.onToggleMute || currentPlayback?.onToggleMute,
    };
  }
  notify();
}

export function updatePlaybackTime(currentTime: number, duration?: number): void {
  if (!currentPlayback) return;
  currentPlayback.currentTime = currentTime;
  if (typeof duration === 'number' && duration > 0) {
    currentPlayback.duration = duration;
  }
  notify();
}

export function setPlaybackOffscreen(isOffscreen: boolean): void {
  if (!currentPlayback || currentPlayback.isOffscreen === isOffscreen) return;
  currentPlayback.isOffscreen = isOffscreen;
  notify();
}

export function setPlaybackNavigatedAway(isNavigatedAway: boolean): void {
  if (!currentPlayback || currentPlayback.isNavigatedAway === isNavigatedAway) return;
  currentPlayback.isNavigatedAway = isNavigatedAway;
  notify();
}

export function togglePlaybackPlayPause(): void {
  if (!currentPlayback) return;
  if (currentPlayback.onTogglePlay) {
    currentPlayback.onTogglePlay();
  } else {
    currentPlayback.isPlaying = !currentPlayback.isPlaying;
    notify();
  }
}

export function togglePlaybackMute(): void {
  if (!currentPlayback) return;
  if (currentPlayback.onToggleMute) {
    currentPlayback.onToggleMute();
  } else {
    currentPlayback.isMuted = !currentPlayback.isMuted;
    notify();
  }
}

export function seekPlayback(seconds: number): void {
  if (!currentPlayback) return;
  if (currentPlayback.onSeek) {
    currentPlayback.onSeek(seconds);
  }
}

export function dismissPlayback(): void {
  if (currentPlayback?.onTogglePlay && currentPlayback.isPlaying) {
    currentPlayback.onTogglePlay();
  }
  currentPlayback = null;
  notify();
}

export function usePlayback() {
  const [playback, setPlayback] = useState<PlaybackMedia | null>(currentPlayback);

  useEffect(() => {
    const listener = (val: PlaybackMedia | null) => {
      setPlayback(val ? { ...val } : null);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    playback,
    isPlaying: Boolean(playback?.isPlaying),
    isOffscreen: Boolean(playback?.isOffscreen),
    isNavigatedAway: Boolean(playback?.isNavigatedAway),
    shouldShowMiniPlayer: Boolean(playback && playback.isPlaying && (playback.isOffscreen || playback.isNavigatedAway)),
    togglePlay: togglePlaybackPlayPause,
    toggleMute: togglePlaybackMute,
    seek: seekPlayback,
    dismiss: dismissPlayback,
  };
}
