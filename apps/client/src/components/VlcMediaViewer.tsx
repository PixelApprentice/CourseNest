import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconVolume, 
  IconVolumeOff, 
  IconMaximize, 
  IconExternalLink, 
  IconCheck, 
  IconDeviceTv, 
  IconAdjustmentsHorizontal, 
  IconGauge, 
  IconBroadcast,
  IconBadgeCc,
  IconHeadphones,
  IconAlertTriangle,
  IconRotateClockwise
} from '@tabler/icons-react';
import { addLog } from '../lib/logger';
import { anySubtitleToVtt } from '../lib/formatHelpers';
import { ThemeLoader } from './ThemeLoader';
import { savePlaybackTime } from '../lib/courseStore';
import { 
  setActivePlayback, 
  updatePlaybackTime, 
  dismissPlayback 
} from '../lib/playbackStore';

export interface SubtitleTrack {
  id?: string;
  label: string;
  language?: string;
  src: string;
  isDefault?: boolean;
}

const EMPTY_SUBTITLES: SubtitleTrack[] = [];

interface VlcMediaViewerProps {
  src: string;
  title?: string;
  courseTitle?: string;
  courseId?: string;
  lessonId?: string;
  subtitles?: SubtitleTrack[];
  isAudio?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  initialTime?: number;
  className?: string;
}

export function VlcMediaViewer({
  src,
  title = 'Course Video Stream',
  courseTitle = 'Course',
  courseId = '',
  lessonId = '',
  subtitles = EMPTY_SUBTITLES,
  isAudio = false,
  onTimeUpdate,
  onEnded,
  initialTime = 0,
  className = '',
}: VlcMediaViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Audio Graph for VLC 200% Super-Gain Booster & Speech Filter
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const speechFilterRef = useRef<BiquadFilterNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Seek and session tracking refs
  const initialTimeAppliedRef = useRef<string | null>(null);
  const prevLessonIdRef = useRef<string>(lessonId);
  const prevSrcRef = useRef<string>(src);
  const currentTimeRef = useRef<number>(0);

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volumePercent, setVolumePercent] = useState(100); // 0% to 200%
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill' | '4:3'>('contain');

  // VLC Advanced Features State
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isSpeechBoostEnabled, setIsSpeechBoostEnabled] = useState(false);
  const [showVlcPanel, setShowVlcPanel] = useState(false);
  const [copiedVlcUrl, setCopiedVlcUrl] = useState(false);
  const [showStatusToast, setShowStatusToast] = useState<string | null>(null);
  const [isCaptionsVisible, setIsCaptionsVisible] = useState(true);
  const [activeSubtitles, setActiveSubtitles] = useState<SubtitleTrack[]>(subtitles);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  // Granular Error Diagnostics
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [errorTimestamp, setErrorTimestamp] = useState(0);
  const [errorTitle, setErrorTitle] = useState('Media Stream Interrupted');
  const [errorMessage, setErrorMessage] = useState('Playback stopped unexpectedly.');
  const [isUnsupportedFormat, setIsUnsupportedFormat] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevSubsKeyRef = useRef<string>('');
  const createdSubtitleBlobUrlsRef = useRef<string[]>([]);

  // State refs for event listeners and keyboard shortcuts (Fixes Item 3 & 9)
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const volumePercentRef = useRef(volumePercent);
  volumePercentRef.current = volumePercent;
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;
  const isCaptionsVisibleRef = useRef(isCaptionsVisible);
  isCaptionsVisibleRef.current = isCaptionsVisible;
  const selectedTrackIndexRef = useRef(selectedTrackIndex);
  selectedTrackIndexRef.current = selectedTrackIndex;

  // Auto-hide controls timer (Fixes Item 9)
  const controlsTimeoutRef = useRef<number | null>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Scrubber dragging state to prevent timeupdate jitter (Fixes Item 6)
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekSliderValue, setSeekSliderValue] = useState(0);
  const isSeekingRef = useRef(false);
  const seekSliderValueRef = useRef(0);
  isSeekingRef.current = isSeeking;
  seekSliderValueRef.current = seekSliderValue;

  // Canonical speed options matching keyboard shortcuts and dropdown (Fixes Item 4)
  const speedOptions = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];

  const handleMouseMove = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlayingRef.current) {
        setIsControlsVisible(false);
      }
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Flush playback progress to persistent storage
  const flushProgress = useCallback((overrideTime?: number, isCompleted?: boolean) => {
    const lId = prevLessonIdRef.current || lessonId;
    if (!lId) return;
    const t = overrideTime !== undefined ? overrideTime : (videoRef.current?.currentTime || currentTimeRef.current);
    const dur = videoRef.current?.duration || duration;
    if (t >= 0 && !isNaN(t)) {
      savePlaybackTime(lId, t, courseId, dur, isCompleted);
    }
  }, [lessonId, courseId, duration]);

  const handleSeekCommit = useCallback((targetTime: number) => {
    setIsSeeking(false);
    isSeekingRef.current = false;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
    currentTimeRef.current = targetTime;
    flushProgress(targetTime);
  }, [flushProgress]);

  // Global window pointerup/touchend safeguard so dragging outside the scrubber always commits cleanly
  useEffect(() => {
    if (!isSeeking) return;
    const onGlobalPointerUp = () => {
      if (isSeekingRef.current) {
        handleSeekCommit(seekSliderValueRef.current);
      }
    };
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('touchend', onGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('touchend', onGlobalPointerUp);
    };
  }, [isSeeking, handleSeekCommit]);

  // Synchronize volume without double attenuation (Fixes Item 7)
  useEffect(() => {
    const volMultiplier = volumePercent / 100;
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (volMultiplier > 1.0) {
        // Boost range (100% to 200%): Element volume at 1.0, Web Audio gain handles boost
        videoRef.current.volume = 1.0;
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = isMuted ? 0 : volMultiplier;
        }
      } else {
        // Normal range (0% to 100%): Web Audio gain at unity (1.0), Element handles volume
        videoRef.current.volume = isMuted ? 0 : volMultiplier;
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = isMuted ? 0 : 1.0;
        }
      }
    }
  }, [volumePercent, isMuted]);

  // Update Speech Boost filter
  useEffect(() => {
    if (speechFilterRef.current) {
      speechFilterRef.current.gain.value = isSpeechBoostEnabled ? 6.0 : 0.0;
    }
  }, [isSpeechBoostEnabled]);

  const showToast = useCallback((message: string) => {
    setShowStatusToast(message);
    setTimeout(() => setShowStatusToast(null), 2500);
  }, []);

  // Toggle Play / Pause - Ignores AbortError (Fixes Item 1)
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('Playback play request prevented:', err);
        }
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setIsControlsVisible(true);
      flushProgress();
    }
  }, [flushProgress]);

  // Seek relative
  const seekRelative = useCallback((delta: number) => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || duration || 0;
    const newTime = Math.max(0, Math.min(dur, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    currentTimeRef.current = newTime;
    showToast(`${delta > 0 ? '+' : ''}${delta}s`);
  }, [duration, showToast]);

  // Speed selection
  const changeSpeed = useCallback((speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    showToast(`Playback Speed: ${speed}x`);
  }, [showToast]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  // Toggle Captions via textTracks (Fixes Item 5)
  const toggleCaptions = useCallback(() => {
    const next = !isCaptionsVisibleRef.current;
    setIsCaptionsVisible(next);
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t) t.mode = next && i === selectedTrackIndexRef.current ? 'showing' : 'hidden';
      }
    }
    showToast(next ? 'Subtitles / Closed Captions ON' : 'Subtitles OFF');
  }, [showToast]);

  // Register with global playback store (Miniplayer & Titlebar)
  useEffect(() => {
    setActivePlayback({
      courseId,
      courseTitle,
      lessonId,
      lessonTitle: title,
      src,
      isPlaying,
      currentTime,
      duration,
      isMuted,
      onTogglePlay: togglePlay,
      onToggleMute: () => setIsMuted((m) => !m),
      onSeek: (t) => {
        if (videoRef.current) {
          videoRef.current.currentTime = t;
          setCurrentTime(t);
          currentTimeRef.current = t;
        }
      },
    });
  }, [isPlaying, isMuted, src, title, courseTitle, courseId, lessonId, currentTime, duration, togglePlay]);

  useEffect(() => {
    return () => {
      dismissPlayback();
    };
  }, []);

  // Sync incoming subtitles only when track identifiers or sources change
  useEffect(() => {
    const subsKey = subtitles.map((s) => `${s.id || ''}:${s.src}:${s.label}`).join('|');
    if (subsKey !== prevSubsKeyRef.current) {
      prevSubsKeyRef.current = subsKey;
      setActiveSubtitles(subtitles);
      setSelectedTrackIndex(0);
    }
  }, [subtitles]);

  // Clean Web Audio source node on video element recreation or switch
  const disconnectAudioSource = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
  }, []);

  // Web Audio initialization (avoids throwing DOMException if re-attaching)
  const ensureAudioGraph = useCallback(() => {
    if (!videoRef.current || sourceNodeRef.current) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(videoRef.current);
      sourceNodeRef.current = source;

      // Gain Node (supports up to 2.0x / 200%)
      const gainNode = gainNodeRef.current || ctx.createGain();
      gainNode.gain.value = isMuted ? 0 : volumePercent / 100;
      gainNodeRef.current = gainNode;

      // Speech Clarity Filter
      const filter = speechFilterRef.current || ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 2500;
      filter.Q.value = 1.0;
      filter.gain.value = isSpeechBoostEnabled ? 6.0 : 0.0;
      speechFilterRef.current = filter;

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Web Audio gain initialization skipped:', err?.message);
    }
  }, [isMuted, volumePercent, isSpeechBoostEnabled]);

  // Video switch & resource cleanup
  useEffect(() => {
    // If switching from another video, flush progress for the outgoing lesson first
    if (prevLessonIdRef.current && prevLessonIdRef.current !== lessonId) {
      flushProgress();
    }

    prevLessonIdRef.current = lessonId;
    prevSrcRef.current = src;
    initialTimeAppliedRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(0);
    setHasPlaybackError(false);
    setIsUnsupportedFormat(false);
    setIsBuffering(Boolean(src));

    // Reset audio source node for new video element
    disconnectAudioSource();

    return () => {
      // Clean up hardware video decode buffer on source change
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {}
      }
    };
  }, [src, lessonId, flushProgress, disconnectAudioSource]);

  // Cleanup subtitle blob URLs and audio context on component unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      for (const u of createdSubtitleBlobUrlsRef.current) {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      }
      createdSubtitleBlobUrlsRef.current = [];
    };
  }, []);

  // Persist progress checkpoints on window close or route unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushProgress();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [flushProgress]);

  // Keyboard Shortcuts with stable listeners (Fixes Items 3 & 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(activeTag) || isEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(200, volumePercentRef.current + 5);
        setVolumePercent(nextVol);
        showToast(`Volume: ${nextVol}%`);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, volumePercentRef.current - 5);
        setVolumePercent(nextVol);
        showToast(`Volume: ${nextVol}%`);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const nextMuted = !isMutedRef.current;
        setIsMuted(nextMuted);
        showToast(nextMuted ? 'Muted' : 'Unmuted');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        toggleCaptions();
      } else if (e.key === '[') {
        e.preventDefault();
        const currentSpeed = playbackSpeedRef.current;
        const currIdx = speedOptions.findIndex((s) => Math.abs(s - currentSpeed) < 0.05);
        if (currIdx > 0) {
          changeSpeed(speedOptions[currIdx - 1]!);
        } else if (currIdx === -1) {
          const lower = speedOptions.filter((s) => s < currentSpeed).pop() || speedOptions[0]!;
          changeSpeed(lower);
        }
      } else if (e.key === ']') {
        e.preventDefault();
        const currentSpeed = playbackSpeedRef.current;
        const currIdx = speedOptions.findIndex((s) => Math.abs(s - currentSpeed) < 0.05);
        if (currIdx !== -1 && currIdx < speedOptions.length - 1) {
          changeSpeed(speedOptions[currIdx + 1]!);
        } else if (currIdx === -1) {
          const higher = speedOptions.find((s) => s > currentSpeed) || speedOptions[speedOptions.length - 1]!;
          changeSpeed(higher);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, toggleCaptions, changeSpeed, showToast, speedOptions]);

  // Frame Stepper
  const stepFrame = (direction: 1 | -1) => {
    if (!videoRef.current) return;
    if (!videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    const frameDuration = 1 / 30; // 30fps stepping
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + direction * frameDuration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    currentTimeRef.current = newTime;
    showToast(direction > 0 ? 'Frame Step +1 (+33ms)' : 'Frame Step -1 (-33ms)');
  };

  // A-B Looping
  const handleSetLoopA = () => {
    setLoopA(currentTime);
    showToast(`VLC Loop [A] set at ${formatTime(currentTime)}`);
  };

  const handleSetLoopB = () => {
    if (loopA !== null && currentTime > loopA) {
      setLoopB(currentTime);
      showToast(`VLC Loop [B] set at ${formatTime(currentTime)} — Looping Active`);
    } else {
      showToast('Point B must be after Point A');
    }
  };

  const clearLoop = () => {
    setLoopA(null);
    setLoopB(null);
    showToast('A-B Loop Cleared');
  };

  // Time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    currentTimeRef.current = curr;
    updatePlaybackTime(curr, duration);

    // Enforce A-B loop boundary
    if (loopA !== null && loopB !== null && curr >= loopB) {
      videoRef.current.currentTime = loopA;
      setCurrentTime(loopA);
      currentTimeRef.current = loopA;
    }

    onTimeUpdate?.(curr, duration);
  };

  // Error diagnostics and recovery
  const handlePlaybackError = () => {
    setIsBuffering(false);
    setIsPlaying(false);
    const stoppedAt = videoRef.current?.currentTime || currentTimeRef.current || currentTime;
    setErrorTimestamp(stoppedAt);
    setHasPlaybackError(true);
    flushProgress(stoppedAt);

    const err = videoRef.current?.error;
    const code = err?.code || 0;

    if (code === 4) {
      // MEDIA_ERR_SRC_NOT_SUPPORTED
      setErrorTitle('Unsupported Format or Missing File');
      setErrorMessage('The browser engine cannot decode this container or video codec (e.g. MKV, AVI, HEVC/H.265), or the file path does not exist. Open in native VLC Media Player.');
      setIsUnsupportedFormat(true);
      addLog('WARN', 'PLAYER', `Unsupported video format or missing file: ${src}`);
    } else if (code === 3) {
      // MEDIA_ERR_DECODE
      setErrorTitle('Video Decode Error');
      setErrorMessage('Hardware decoder encountered an error. The video file may be partially corrupted or encoded in an unsupported profile. Open in native VLC.');
      setIsUnsupportedFormat(true);
      addLog('WARN', 'PLAYER', `Video decoding error on stream: ${src}`);
    } else if (code === 2) {
      // MEDIA_ERR_NETWORK
      setErrorTitle('Storage / Network Interrupted');
      setErrorMessage(`Storage access was interrupted at ${Math.round(stoppedAt)}s. If your external HDD was unplugged, reconnect it and retry.`);
      setIsUnsupportedFormat(false);
      addLog('WARN', 'PLAYER', `Media stream interrupted at ${Math.round(stoppedAt)}s. Possible storage disconnection.`);
    } else {
      setErrorTitle('Media Stream Error');
      setErrorMessage(`Playback stopped at ${Math.round(stoppedAt)}s. Reconnect external drive if detached, or retry playback.`);
      setIsUnsupportedFormat(false);
      addLog('WARN', 'PLAYER', `Media error ${code} at ${Math.round(stoppedAt)}s.`);
    }
  };

  const handleRetryStream = () => {
    setHasPlaybackError(false);
    setIsUnsupportedFormat(false);
    setErrorMessage('');
    setIsBuffering(true);
    if (videoRef.current) {
      const restorePos = errorTimestamp > 0 ? errorTimestamp : (currentTimeRef.current || initialTime);
      videoRef.current.load();
      if (restorePos > 0) {
        const onLoaded = () => {
          if (videoRef.current) {
            videoRef.current.currentTime = restorePos;
            setCurrentTime(restorePos);
            currentTimeRef.current = restorePos;
          }
          videoRef.current?.removeEventListener('loadedmetadata', onLoaded);
        };
        videoRef.current.addEventListener('loadedmetadata', onLoaded);
      }
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch((err) => {
        setIsBuffering(false);
        if (err?.name !== 'AbortError') {
          console.warn('Retry play error:', err);
        }
      });
    }
  };

  // Open in External VLC Media Player (Fixes Item 8)
  const handleOpenInVlc = async () => {
    let cleanPath = src;
    if (cleanPath.startsWith('vault-media://')) {
      const match = cleanPath.match(/^vault-media:\/\/([^/]+)\/(.+)$/);
      if (match && match[2]) {
        cleanPath = match[2];
      } else {
        cleanPath = cleanPath.replace('vault-media://', '');
      }
    }
    cleanPath = decodeURIComponent(cleanPath);

    const electron = (window as any).electron || (window as any).__ELECTRON__;
    if (electron?.shell?.openExternalFile) {
      const res = await electron.shell.openExternalFile(cleanPath);
      if (res?.success) {
        showToast('Opened in native media player');
        return;
      }
    }

    const vlcProtocolUrl = `vlc://${encodeURI(cleanPath)}`;
    try {
      navigator.clipboard.writeText(cleanPath);
      setCopiedVlcUrl(true);
      setTimeout(() => setCopiedVlcUrl(false), 3000);
    } catch {}

    addLog('INFO', 'PLAYER', 'Invoking native VLC Media Player Bridge', `Source: ${cleanPath}`);
    window.location.href = vlcProtocolUrl;
    showToast('Source copied to clipboard. Launching VLC Media Player...');
  };

  // Apply initial seek time per video session
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);

    const sessionKey = `${lessonId}:${src}`;
    if (initialTime > 0 && initialTimeAppliedRef.current !== sessionKey && dur > 0) {
      const targetTime = Math.min(initialTime, Math.max(0, dur - 1));
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      currentTimeRef.current = targetTime;
      initialTimeAppliedRef.current = sessionKey;
    }

    // Initialize subtitle text tracks
    if (subtitles.length > 0 && videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t) t.mode = isCaptionsVisible ? 'showing' : 'hidden';
      }
    }
  };

  // React to asynchronous initialTime arrival from database or IndexedDB
  useEffect(() => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    const sessionKey = `${lessonId}:${src}`;
    if (
      initialTime > 0 &&
      dur > 0 &&
      initialTimeAppliedRef.current !== sessionKey &&
      videoRef.current.currentTime < 1
    ) {
      const targetTime = Math.min(initialTime, Math.max(0, dur - 1));
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      currentTimeRef.current = targetTime;
      initialTimeAppliedRef.current = sessionKey;
    }
  }, [initialTime, lessonId, src]);

  // Picture-in-Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      showToast('Picture-in-Picture not supported on this stream');
    }
  };

  const selectSubtitleTrack = (index: number) => {
    setSelectedTrackIndex(index);
    setIsCaptionsVisible(true);
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const tr = tracks[i];
        if (tr) tr.mode = i === index ? 'showing' : 'hidden';
      }
    }
    showToast(`Active Subtitles: ${activeSubtitles[index]?.label || 'Track ' + (index + 1)}`);
  };

  const handleSubtitleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const vtt = anySubtitleToVtt(text, file.name);
      const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
      createdSubtitleBlobUrlsRef.current.push(blobUrl);
      const newTrack: SubtitleTrack = {
        id: `custom-sub-${Date.now()}`,
        label: file.name.replace(/\.[^/.]+$/, '').replace(/^[0-9\s._-]+/, '') || 'Custom Subtitles',
        language: 'custom',
        src: blobUrl,
        isDefault: true,
      };
      const nextList = [...activeSubtitles, newTrack];
      setActiveSubtitles(nextList);
      const newIdx = nextList.length - 1;
      setSelectedTrackIndex(newIdx);
      setIsCaptionsVisible(true);
      if (videoRef.current) {
        setTimeout(() => {
          const tracks = videoRef.current?.textTracks;
          if (tracks) {
            for (let i = 0; i < tracks.length; i++) {
              const tr = tracks[i];
              if (tr) tr.mode = i === newIdx ? 'showing' : 'hidden';
            }
          }
        }, 100);
      }
      showToast(`Loaded Subtitle: ${file.name}`);
      addLog('INFO', 'PLAYER', `Loaded custom subtitle: ${file.name}`);
    } catch (err: any) {
      showToast(`Failed to parse subtitle: ${err?.message}`);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isAudio) {
    return (
      <div 
        ref={containerRef}
        className={`w-full bg-gradient-to-br from-[#181920] to-[#0f1015] border border-[var(--cn-border)] rounded-2xl p-6 md:p-8 shadow-xl space-y-6 select-none ${className}`}
      >
        <video
          key={`${lessonId}-${src}`}
          ref={videoRef}
          src={src}
          playsInline
          className="hidden"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            flushProgress();
          }}
          onError={handlePlaybackError}
          onEnded={() => {
            setIsPlaying(false);
            flushProgress(duration, true);
            onEnded?.();
          }}
        />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--cn-primary-tint)] border border-[var(--cn-primary)]/30 text-[var(--cn-primary)] flex items-center justify-center shrink-0">
            <IconHeadphones size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EA580C]/20 text-[#FB923C] border border-[#EA580C]/30">
                AUDIO LECTURE
              </span>
              <span className="text-[10px] font-mono text-[var(--cn-text-muted)]">
                Offline Vault Audio
              </span>
            </div>
            <h3 className="font-bold text-base text-white truncate mt-1">{title}</h3>
          </div>
        </div>

        {/* Audio Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={isSeeking ? seekSliderValue : currentTime}
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore if capture fails
              }
              setIsSeeking(true);
              isSeekingRef.current = true;
              setSeekSliderValue(currentTimeRef.current);
              seekSliderValueRef.current = currentTimeRef.current;
            }}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSeekSliderValue(val);
              seekSliderValueRef.current = val;
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore if release fails
              }
              handleSeekCommit(seekSliderValueRef.current);
            }}
            onPointerCancel={() => {
              handleSeekCommit(seekSliderValueRef.current);
            }}
            className="w-full h-1.5 bg-white/20 hover:h-2 rounded-lg appearance-none cursor-pointer accent-[var(--cn-brand)] transition-[height] duration-150 ease-out"
          />
          <div className="flex items-center justify-between text-xs font-mono text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-[var(--cn-brand)] text-black font-bold hover:brightness-110 transition-[transform,filter] duration-150 ease-out shadow-md active:scale-95"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
            </button>

            <button
              onClick={() => seekRelative(-5)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-mono"
            >
              -5s
            </button>
            <button
              onClick={() => seekRelative(5)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-mono"
            >
              +5s
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-white/80 hover:text-white"
            >
              {isMuted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={playbackSpeed}
              onChange={(e) => changeSpeed(parseFloat(e.target.value))}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs font-mono text-white cursor-pointer"
            >
              {speedOptions.map((s) => (
                <option key={s} value={s} className="bg-[#121316] text-white">
                  {s}x
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[var(--cn-border)] select-none group ${className}`}
    >
      {/* Video Element with Dynamic Aspect Ratio */}
      <video
        key={`${lessonId}-${src}`}
        ref={videoRef}
        src={src}
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        className={`w-full h-full cursor-pointer transition-[transform] duration-200 ease-out ${
          aspectRatio === 'cover'
            ? 'object-cover'
            : aspectRatio === 'fill'
            ? 'object-fill'
            : aspectRatio === '4:3'
            ? 'object-contain scale-x-75'
            : 'object-contain'
        }`}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          flushProgress();
        }}
        onSeeked={() => {
          flushProgress();
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onCanPlay={() => setIsBuffering(false)}
        onLoadStart={() => setIsBuffering(Boolean(src))}
        onError={handlePlaybackError}
        onEnded={() => {
          setIsPlaying(false);
          flushProgress(videoRef.current?.duration || duration, true);
          onEnded?.();
        }}
      >
        {activeSubtitles.map((sub, idx) => (
          <track
            key={sub.id || idx}
            label={sub.label}
            kind="subtitles"
            srcLang={sub.language || 'en'}
            src={sub.src}
            default={isCaptionsVisible && idx === selectedTrackIndex}
          />
        ))}
      </video>

      {/* Clear Error State & Fallback Overlay (Issue 1) */}
      {hasPlaybackError && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-13 h-13 rounded-2xl bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border border-[var(--cn-warning)]/40 flex items-center justify-center shadow-xl">
            <IconAlertTriangle size={28} />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h4 className="text-base font-bold text-white tracking-tight">{errorTitle}</h4>
            <p className="text-xs text-white/80 font-mono leading-relaxed">
              {errorMessage}
            </p>
            {errorTimestamp > 0 && (
              <p className="text-[11px] text-[var(--cn-warning)] font-mono font-semibold">
                Saved position preserved at {formatTime(errorTimestamp)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              onClick={handleRetryStream}
              className="cn-btn cn-btn-md cn-btn-primary"
            >
              <IconRotateClockwise size={15} />
              <span>Retry & Resume</span>
            </button>

            <button
              onClick={handleOpenInVlc}
              className="cn-btn cn-btn-md cn-btn-secondary !bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
              title="Launch native VLC Media Player to stream this file directly"
            >
              <IconExternalLink size={14} />
              <span>{isUnsupportedFormat ? 'Play in Native VLC (Supported)' : 'Open in VLC'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Buffering Loader Overlay */}
      {(isBuffering || !src) && !hasPlaybackError && (
        <div className="absolute inset-0 z-25 bg-black/75 backdrop-blur-xs flex items-center justify-center pointer-events-none transition-opacity duration-200 ease-out">
          <ThemeLoader size="lg" text={!src ? 'Accessing Local Vault...' : 'Buffering Stream...'} />
        </div>
      )}

      {/* Floating Status Toast */}
      {showStatusToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-[var(--cn-brand)]/40 text-[var(--cn-brand)] text-xs font-mono font-semibold shadow-xl z-30 animate-in fade-in zoom-in duration-150">
          {showStatusToast}
        </div>
      )}

      {/* Header Overlay (Fixes Item 9) */}
      <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between transition-opacity duration-200 z-20 ${
        isControlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EA580C]/25 text-[#FB923C] border border-[#EA580C]/40 text-[11px] font-mono font-bold">
            <IconBroadcast size={13} className="text-[#FB923C]" />
            <span>VIDEO ENGINE</span>
          </div>
          <span className="text-white text-xs font-semibold truncate max-w-sm hidden sm:inline">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* External VLC Player Launcher */}
          <button
            onClick={handleOpenInVlc}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono border border-white/20 transition-colors"
            title="Open in native VLC Media Player desktop application"
          >
            {copiedVlcUrl ? <IconCheck size={13} className="text-[var(--cn-brand)]" /> : <IconExternalLink size={13} />}
            <span>{copiedVlcUrl ? 'Copied' : 'Open in VLC'}</span>
          </button>

          {/* VLC Advanced Panel Toggle */}
          <button
            onClick={() => setShowVlcPanel(!showVlcPanel)}
            className={`p-1.5 rounded-md border text-xs font-mono transition-colors ${
              showVlcPanel
                ? 'bg-[var(--cn-brand)] text-black border-[var(--cn-brand)] font-bold'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title="VLC Advanced Audio/Video Adjustments"
          >
            <IconAdjustmentsHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* VLC Advanced Audio & Codec Drawer */}
      {showVlcPanel && (
        <div className="absolute top-14 right-4 w-72 rounded-xl bg-black/95 backdrop-blur-xl border border-[var(--cn-border)] p-4 shadow-2xl z-30 space-y-3.5 text-xs font-mono text-white">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold flex items-center gap-1.5 text-[var(--cn-brand)]">
              <IconAdjustmentsHorizontal size={14} />
              Audio & Video Settings
            </span>
            <button 
              onClick={() => setShowVlcPanel(false)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Super Gain Booster (up to 200%) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/80">Audio Gain Booster</span>
              <span className={`font-bold ${volumePercent > 100 ? 'text-[#F59E0B]' : 'text-[var(--cn-brand)]'}`}>
                {volumePercent}% {volumePercent > 100 && '(Super-Gain)'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={volumePercent}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val > 100) ensureAudioGraph();
                setVolumePercent(val);
              }}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--cn-brand)]"
            />
            <p className="text-[10px] text-white/50">VLC amplification for quiet lecture audio.</p>
          </div>

          {/* Speech Clarity Filter */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-white/80">Vocal Clarity Boost</span>
            <button
              onClick={() => {
                ensureAudioGraph();
                setIsSpeechBoostEnabled(!isSpeechBoostEnabled);
                showToast(!isSpeechBoostEnabled ? 'Vocal Clarity Enabled (+6dB @ 2.5kHz)' : 'Vocal Clarity Disabled');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                isSpeechBoostEnabled
                  ? 'bg-[var(--cn-brand)] text-black border-[var(--cn-brand)]'
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
              }`}
            >
              {isSpeechBoostEnabled ? 'ON (+6dB)' : 'OFF'}
            </button>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <span className="text-[11px] text-white/80">Aspect Ratio Fit</span>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {(['contain', 'cover', 'fill', '4:3'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAspectRatio(mode);
                    showToast(`Aspect Ratio: ${mode.toUpperCase()}`);
                  }}
                  className={`py-1 rounded border transition-colors capitalize ${
                    aspectRatio === mode
                      ? 'bg-[var(--cn-brand)] text-black border-[var(--cn-brand)] font-bold'
                      : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* A-B Loop Section */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/80">A-B Segment Loop</span>
              {(loopA !== null || loopB !== null) && (
                <button onClick={clearLoop} className="text-[10px] text-[var(--cn-brand)] hover:underline">
                  Reset
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleSetLoopA}
                className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                  loopA !== null
                    ? 'bg-white/20 text-[var(--cn-brand)] border-[var(--cn-brand)]/40'
                    : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'
                }`}
              >
                Set [A] {loopA !== null ? `(${formatTime(loopA)})` : ''}
              </button>
              <button
                onClick={handleSetLoopB}
                className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                  loopB !== null
                    ? 'bg-[var(--cn-brand)] text-black border-[var(--cn-brand)]'
                    : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'
                }`}
              >
                Set [B] {loopB !== null ? `(${formatTime(loopB)})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar Overlay (Fixes Item 6 & 9) */}
      <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2 transition-opacity duration-200 z-20 ${
        isControlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Scrubber Progress Bar */}
        <div className="relative w-full group/scrubber cursor-pointer py-1.5 cn-scrubber">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={isSeeking ? seekSliderValue : currentTime}
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore if capture fails
              }
              setIsSeeking(true);
              isSeekingRef.current = true;
              setSeekSliderValue(currentTimeRef.current);
              seekSliderValueRef.current = currentTimeRef.current;
            }}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSeekSliderValue(val);
              seekSliderValueRef.current = val;
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // Ignore if release fails
              }
              handleSeekCommit(seekSliderValueRef.current);
            }}
            onPointerCancel={() => {
              handleSeekCommit(seekSliderValueRef.current);
            }}
            className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-lg appearance-none cursor-pointer accent-[var(--cn-brand)] transition-[height] duration-150 ease-out"
          />

          {/* A-B Loop Indicators on Scrubber */}
          {duration > 0 && loopA !== null && (
            <div
              className="absolute top-1.5 w-1.5 h-2.5 bg-[#F59E0B] rounded-xs pointer-events-none shadow-xs"
              style={{ left: `${(loopA / duration) * 100}%` }}
              title={`Loop Point A: ${formatTime(loopA)}`}
            />
          )}
          {duration > 0 && loopB !== null && (
            <div
              className="absolute top-1.5 w-1.5 h-2.5 bg-[var(--cn-brand)] rounded-xs pointer-events-none shadow-xs"
              style={{ left: `${(loopB / duration) * 100}%` }}
              title={`Loop Point B: ${formatTime(loopB)}`}
            />
          )}
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between text-white font-mono text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="cn-btn-tactile p-2 rounded-lg bg-[var(--cn-brand)] text-black hover:brightness-110 font-bold shadow-sm"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <IconPlayerPause size={17} /> : <IconPlayerPlay size={17} />}
            </button>

            {/* Frame-by-Frame Steppers */}
            <button
              onClick={() => stepFrame(-1)}
              className="cn-btn-tactile px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white"
              title="Step -1 Frame (-33ms)"
            >
              ◀|
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="cn-btn-tactile px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white"
              title="Step +1 Frame (+33ms)"
            >
              |▶
            </button>

            {/* Jump -5s / +5s */}
            <button
              onClick={() => seekRelative(-5)}
              className="cn-btn-tactile px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[11px] hover:text-[var(--cn-brand)]"
              title="Rewind 5s (←)"
            >
              -5s
            </button>
            <button
              onClick={() => seekRelative(5)}
              className="cn-btn-tactile px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[11px] hover:text-[var(--cn-brand)]"
              title="Forward 5s (→)"
            >
              +5s
            </button>

            {/* Mute and Volume Indicator */}
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                }}
                className="cn-btn-tactile p-1 hover:text-[var(--cn-brand)]"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volumePercent === 0 ? <IconVolumeOff size={17} /> : <IconVolume size={17} />}
              </button>
              <span className={`text-[10px] ${volumePercent > 100 ? 'text-[#F59E0B] font-bold' : 'text-white/70'}`}>
                {isMuted ? '0%' : `${volumePercent}%`}
              </span>
            </div>

            {/* Time Stamp */}
            <span className="text-[11px] text-white/80 pl-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Subtitles / CC Toggle and Language Selector */}
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                accept=".vtt,.srt,.sbv,.ass,.ssa,.sub,.lrc"
                className="hidden"
                onChange={handleSubtitleUpload}
              />
              {activeSubtitles.length > 0 && (
                <button
                  onClick={toggleCaptions}
                  className={`cn-btn-tactile flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    isCaptionsVisible
                      ? 'bg-[var(--cn-brand)] text-black font-bold'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  title={isCaptionsVisible ? 'Turn Off Closed Captions (C)' : 'Turn On Closed Captions (C)'}
                >
                  <IconBadgeCc size={16} />
                  <span className="text-[10px] hidden sm:inline">CC</span>
                </button>
              )}
              {activeSubtitles.length > 1 && (
                <select
                  value={selectedTrackIndex}
                  onChange={(e) => selectSubtitleTrack(parseInt(e.target.value, 10))}
                  className="cn-btn-tactile bg-white/10 hover:bg-white/20 border border-white/20 rounded px-1.5 py-0.5 text-[11px] text-white cursor-pointer focus:outline-hidden"
                  title="Select Subtitle Track"
                >
                  {activeSubtitles.map((track, i) => (
                    <option key={track.id || i} value={i} className="bg-[#121316] text-white">
                      {track.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="cn-btn-tactile px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[11px] font-mono"
                title="Load External Subtitle File (.srt, .vtt, .sbv, .ass, .lrc)"
              >
                +CC
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1">
              <IconGauge size={14} className="text-white/60 hidden sm:inline" />
              <select
                value={playbackSpeed}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                className="cn-btn-tactile bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2 py-0.5 text-[11px] text-white cursor-pointer focus:outline-hidden"
                title="Playback Speed ([ / ])"
              >
                {speedOptions.map((s) => (
                  <option key={s} value={s} className="bg-[#121316] text-white">
                    {s}x
                  </option>
                ))}
              </select>
            </div>

            {/* Picture-in-Picture */}
            <button
              onClick={togglePiP}
              className="cn-btn-tactile p-1 text-white/80 hover:text-white"
              title="Picture-in-Picture"
            >
              <IconDeviceTv size={16} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="cn-btn-tactile p-1 text-white/80 hover:text-white"
              title="Toggle Fullscreen (F)"
            >
              <IconMaximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
