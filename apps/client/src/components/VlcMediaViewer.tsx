import { useState, useEffect, useRef } from 'react';
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
  IconHeadphones
} from '@tabler/icons-react';
import { addLog } from '../lib/logger';
import { anySubtitleToVtt } from '../lib/formatHelpers';

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
  const initialTimeAppliedRef = useRef<string | null>(null);

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevSubsKeyRef = useRef<string>('');

  // Sync incoming subtitles only when track identifiers or sources actually change
  useEffect(() => {
    const subsKey = subtitles.map((s) => `${s.id || ''}:${s.src}:${s.label}`).join('|');
    if (subsKey !== prevSubsKeyRef.current) {
      prevSubsKeyRef.current = subsKey;
      setActiveSubtitles(subtitles);
      setSelectedTrackIndex(0);
    }
  }, [subtitles]);

  // Toggle Subtitles / Closed Captions
  const toggleCaptions = () => {
    const next = !isCaptionsVisible;
    setIsCaptionsVisible(next);
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t) t.mode = next && i === selectedTrackIndex ? 'showing' : 'hidden';
      }
    }
    showToast(next ? 'Subtitles / Closed Captions ON' : 'Subtitles OFF');
  };

  // Select Active Subtitle Language Track
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

  // Upload and Parse Custom Subtitle File
  const handleSubtitleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const vtt = anySubtitleToVtt(text, file.name);
      const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
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
      showToast(`Failed to parse subtitle: ${err.message}`);
    }
  };

  // Reset tracking on source change
  useEffect(() => {
    initialTimeAppliedRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  // Clean up Web Audio graph on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Lazy Web Audio API initialization ONLY when super-gain or speech filter is requested
  const ensureAudioGraph = () => {
    if (!videoRef.current || audioContextRef.current) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(videoRef.current);
      sourceNodeRef.current = source;

      // Gain Node (supports up to 2.0x / 200%)
      const gainNode = ctx.createGain();
      gainNode.gain.value = isMuted ? 0 : volumePercent / 100;
      gainNodeRef.current = gainNode;

      // Speech Clarity Filter (Biquad peaking filter for lecture vocals)
      const filter = ctx.createBiquadFilter();
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
      console.warn('Web Audio gain initialization skipped:', err.message);
    }
  };

  // Synchronize volume
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      gainNodeRef.current.gain.value = isMuted ? 0 : volumePercent / 100;
    }

    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : Math.min(1.0, volumePercent / 100);
      videoRef.current.muted = isMuted;
    }
  }, [volumePercent, isMuted]);

  // Update Speech Boost filter
  useEffect(() => {
    if (speechFilterRef.current) {
      speechFilterRef.current.gain.value = isSpeechBoostEnabled ? 6.0 : 0.0;
    }
  }, [isSpeechBoostEnabled]);

  const showToast = (message: string) => {
    setShowStatusToast(message);
    setTimeout(() => setShowStatusToast(null), 2500);
  };

  // Toggle Play / Pause using native hardware element
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback play request prevented:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // VLC Frame Stepper
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
    showToast(direction > 0 ? 'Frame Step +1 (+33ms)' : 'Frame Step -1 (-33ms)');
  };

  // Seek Relative
  const seekRelative = (delta: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    showToast(`${delta > 0 ? '+' : ''}${delta}s`);
  };

  // Speed selection
  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    showToast(`Playback Speed: ${speed}x`);
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

  // Time update and loop listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Enforce A-B loop boundary
    if (loopA !== null && loopB !== null && curr >= loopB) {
      videoRef.current.currentTime = loopA;
      setCurrentTime(loopA);
    }

    onTimeUpdate?.(curr, duration);
  };

  // Apply initial seek time ONLY ONCE per video src
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);

    if (initialTime > 0 && initialTimeAppliedRef.current !== src && dur > 0) {
      const targetTime = Math.min(initialTime, Math.max(0, dur - 1));
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      initialTimeAppliedRef.current = src;
    }

    // Initialize track modes
    if (subtitles.length > 0 && videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t) t.mode = isCaptionsVisible ? 'showing' : 'hidden';
      }
    }
  };

  // Native Picture-in-Picture
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

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  // Open in External VLC Media Player (vlc:// protocol)
  const handleOpenInVlc = () => {
    const vlcProtocolUrl = `vlc://${encodeURI(src)}`;
    navigator.clipboard.writeText(src);
    setCopiedVlcUrl(true);
    setTimeout(() => setCopiedVlcUrl(false), 3000);

    addLog('INFO', 'PLAYER', 'Invoking VLC Stream Bridge', `Source: ${src}`);
    window.location.href = vlcProtocolUrl;
    showToast('Source copied to clipboard. Launching VLC Media Player...');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  if (isAudio) {
    return (
      <div 
        ref={containerRef}
        className={`w-full bg-gradient-to-br from-[#181920] to-[#0f1015] border border-[var(--cn-border)] rounded-2xl p-6 md:p-8 shadow-xl space-y-6 select-none ${className}`}
      >
        <video
          key={src}
          ref={videoRef}
          src={src}
          playsInline
          className="hidden"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={onEnded}
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
            value={currentTime}
            onChange={(e) => {
              const newTime = parseFloat(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = newTime;
              setCurrentTime(newTime);
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
              title={isPlaying ? 'Pause' : 'Play'}
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
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[var(--cn-border)] select-none group ${className}`}
    >
      {/* Video Element with Dynamic Aspect Ratio */}
      <video
        key={src}
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
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

      {/* Floating Status Toast */}
      {showStatusToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-[var(--cn-brand)]/40 text-[var(--cn-brand)] text-xs font-mono font-semibold shadow-xl z-30 animate-in fade-in zoom-in duration-150">
          {showStatusToast}
        </div>
      )}

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
                const val = parseInt(e.target.value);
                if (val > 100) ensureAudioGraph();
                setVolumePercent(val);
              }}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--cn-brand)]"
            />
            <p className="text-[10px] text-white/50">VLC signature amplification for quiet lecture audio.</p>
          </div>

          {/* Speech / Dialogue Clarity Filter */}
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

      {/* Control Bar Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2 transition-opacity z-20">
        {/* Scrubber Progress Bar */}
        <div className="relative w-full group/scrubber cursor-pointer py-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const newTime = parseFloat(e.target.value);
              if (videoRef.current) {
                videoRef.current.currentTime = newTime;
              }
              setCurrentTime(newTime);
            }}
            className="w-full h-1 bg-white/20 hover:h-2 rounded-lg appearance-none cursor-pointer accent-[var(--cn-brand)] transition-[height] duration-150 ease-out"
          />

          {/* A-B Loop Indicators on Scrubber */}
          {duration > 0 && loopA !== null && (
            <div
              className="absolute top-1 w-1 h-2 bg-[#F59E0B] rounded-xs pointer-events-none"
              style={{ left: `${(loopA / duration) * 100}%` }}
              title={`Loop Point A: ${formatTime(loopA)}`}
            />
          )}
          {duration > 0 && loopB !== null && (
            <div
              className="absolute top-1 w-1 h-2 bg-[var(--cn-brand)] rounded-xs pointer-events-none"
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
              className="p-1.5 rounded-lg bg-[var(--cn-brand)] text-black hover:brightness-110 transition-[transform,filter] duration-150 ease-out active:scale-95 font-bold"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <IconPlayerPause size={17} /> : <IconPlayerPlay size={17} />}
            </button>

            {/* Frame-by-Frame Steppers */}
            <button
              onClick={() => stepFrame(-1)}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white transition-colors"
              title="Step -1 Frame (-33ms)"
            >
              ◀|
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white transition-colors"
              title="Step +1 Frame (+33ms)"
            >
              |▶
            </button>

            {/* Jump -5s / +5s */}
            <button
              onClick={() => seekRelative(-5)}
              className="text-[11px] hover:text-[var(--cn-brand)] px-1"
              title="Rewind 5s"
            >
              -5s
            </button>
            <button
              onClick={() => seekRelative(5)}
              className="text-[11px] hover:text-[var(--cn-brand)] px-1"
              title="Forward 5s"
            >
              +5s
            </button>

            {/* Mute and Volume Indicator */}
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                }}
                className="p-1 hover:text-[var(--cn-brand)] transition-colors"
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                    isCaptionsVisible
                      ? 'bg-[var(--cn-brand)] text-black font-bold'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  title={isCaptionsVisible ? 'Turn Off Closed Captions' : 'Turn On Closed Captions'}
                >
                  <IconBadgeCc size={16} />
                  <span className="text-[10px] hidden sm:inline">CC</span>
                </button>
              )}
              {activeSubtitles.length > 1 && (
                <select
                  value={selectedTrackIndex}
                  onChange={(e) => selectSubtitleTrack(parseInt(e.target.value, 10))}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-1.5 py-0.5 text-[11px] text-white cursor-pointer focus:outline-hidden"
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
                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[11px] font-mono transition-colors"
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
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2 py-0.5 text-[11px] text-white cursor-pointer focus:outline-hidden"
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
              className="p-1 text-white/80 hover:text-white transition-colors"
              title="Picture-in-Picture"
            >
              <IconDeviceTv size={16} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 text-white/80 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <IconMaximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
