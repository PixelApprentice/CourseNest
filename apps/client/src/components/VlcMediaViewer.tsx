import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  ExternalLink,
  Check,
  Tv,
  Sliders,
  Gauge,
  Radio
} from 'lucide-react';
import { addLog } from '../lib/logger';

interface VlcMediaViewerProps {
  src: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  className?: string;
}

export function VlcMediaViewer({
  src,
  title = 'Course Video Stream',
  onTimeUpdate,
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

  // Initialize Web Audio API on first user interaction for VLC Super-Gain
  const ensureAudioGraph = () => {
    if (!videoRef.current || audioContextRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(videoRef.current);
      sourceNodeRef.current = source;

      // Gain Node (supports up to 2.0x / 200%)
      const gainNode = ctx.createGain();
      gainNode.gain.value = volumePercent / 100;
      gainNodeRef.current = gainNode;

      // Speech Clarity Filter (Biquad high-pass / peaking filter for lecture vocals)
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 2500; // Presence range for speech intelligibility
      filter.Q.value = 1.0;
      filter.gain.value = isSpeechBoostEnabled ? 6.0 : 0.0;
      speechFilterRef.current = filter;

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (err: any) {
      console.warn('Web Audio gain initialization skipped (e.g. cross-origin media):', err.message);
    }
  };

  // Update Gain when volumePercent changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      // Linear gain: 100% -> 1.0, 200% -> 2.0
      gainNodeRef.current.gain.value = isMuted ? 0 : volumePercent / 100;
    } else if (videoRef.current) {
      // Fallback for native HTML5 volume when Web Audio is not active
      videoRef.current.volume = isMuted ? 0 : Math.min(1.0, volumePercent / 100);
    }
  }, [volumePercent, isMuted]);

  // Update Speech Boost filter
  useEffect(() => {
    if (speechFilterRef.current) {
      speechFilterRef.current.gain.value = isSpeechBoostEnabled ? 6.0 : 0.0;
    }
  }, [isSpeechBoostEnabled]);

  // Set initial time
  useEffect(() => {
    if (videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

  const showToast = (message: string) => {
    setShowStatusToast(message);
    setTimeout(() => setShowStatusToast(null), 2500);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    ensureAudioGraph();

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // VLC Frame Stepper
  const stepFrame = (direction: 1 | -1) => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    const frameDuration = 1 / 30; // standard 30fps stepping
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

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    if (initialTime > 0 && initialTime < videoRef.current.duration) {
      videoRef.current.currentTime = initialTime;
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
    } catch (err: any) {
      showToast('Picture-in-Picture not supported on this stream');
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  // Open in External VLC Media Player (vlc:// protocol & path helper)
  const handleOpenInVlc = () => {
    const vlcProtocolUrl = `vlc://${encodeURI(src)}`;
    navigator.clipboard.writeText(src);
    setCopiedVlcUrl(true);
    setTimeout(() => setCopiedVlcUrl(false), 3000);

    // Log diagnostic event
    addLog('INFO', 'PLAYER', 'Invoking Open-Source VLC Stream Bridge', `Source: ${src}`);

    // Attempt launch via protocol handler
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

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[var(--cn-border)] select-none group ${className}`}
    >
      {/* Video Element with Dynamic Aspect Ratio */}
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full cursor-pointer transition-all ${
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
      />

      {/* Floating Status Toast */}
      {showStatusToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-[var(--cn-brand)]/40 text-[var(--cn-brand)] text-xs font-mono font-semibold shadow-xl z-30 animate-in fade-in zoom-in duration-150">
          {showStatusToast}
        </div>
      )}

      {/* VLC Engine Badge Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EA580C]/25 text-[#FB923C] border border-[#EA580C]/40 text-[11px] font-mono font-bold">
            <Radio size={12} className="text-[#FB923C]" />
            <span>VLC AUDIO/VIDEO CORE</span>
          </div>
          <span className="text-white text-xs font-semibold truncate max-w-sm hidden sm:inline">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* External VLC Player Launcher */}
          <button
            onClick={handleOpenInVlc}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono border border-white/20 transition-colors"
            title="Open in native VLC Media Player desktop application"
          >
            {copiedVlcUrl ? <Check size={12} className="text-[var(--cn-brand)]" /> : <ExternalLink size={12} />}
            <span>{copiedVlcUrl ? 'Path Copied!' : 'Open in VLC'}</span>
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
            <Sliders size={14} />
          </button>
        </div>
      </div>

      {/* VLC Advanced Audio & Codec Drawer */}
      {showVlcPanel && (
        <div className="absolute top-14 right-4 w-72 rounded-xl bg-black/95 backdrop-blur-xl border border-[var(--cn-border)] p-4 shadow-2xl z-30 space-y-3.5 text-xs font-mono text-white">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold flex items-center gap-1.5 text-[var(--cn-brand)]">
              <Sliders size={13} />
              VLC Playback Parameters
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
                ensureAudioGraph();
                setVolumePercent(parseInt(e.target.value));
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
                showToast(isSpeechBoostEnabled ? 'Vocal Clarity Disabled' : 'Vocal Clarity Enabled (+6dB @ 2.5kHz)');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                isSpeechBoostEnabled
                  ? 'bg-[var(--cn-brand)] text-black border-[var(--cn-brand)]'
                  : 'bg-white/10 text-white/70 border-white/20 hover:text-white'
              }`}
            >
              {isSpeechBoostEnabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          {/* A-B Loop Controls */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/80">A-B Looper</span>
              {loopA !== null && (
                <span className="text-[10px] text-[var(--cn-brand)] font-bold">
                  {formatTime(loopA)} → {loopB !== null ? formatTime(loopB) : '...'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={handleSetLoopA}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white border border-white/15"
              >
                Set [A]
              </button>
              <button
                onClick={handleSetLoopB}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white border border-white/15"
              >
                Set [B]
              </button>
              <button
                onClick={clearLoop}
                className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/40 text-[10px] font-bold text-red-300 border border-red-500/30"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-white/80">Aspect Ratio Override</span>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {(['contain', 'cover', 'fill', '4:3'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => {
                    setAspectRatio(ratio);
                    showToast(`Aspect Ratio: ${ratio.toUpperCase()}`);
                  }}
                  className={`py-1 rounded text-center font-bold border transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-[var(--cn-brand)] text-black border-[var(--cn-brand)]'
                      : 'bg-white/10 text-white/70 border-white/15 hover:text-white'
                  }`}
                >
                  {ratio.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2.5 opacity-90 group-hover:opacity-100 transition-opacity z-20">
        {/* Scrub Bar with Loop Markers */}
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = val;
              setCurrentTime(val);
            }}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--cn-brand)]"
          />

          {/* Loop A indicator */}
          {loopA !== null && duration > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-1 bg-[#57C564] pointer-events-none rounded-full"
              style={{ left: `${(loopA / duration) * 100}%` }}
              title={`Loop A: ${formatTime(loopA)}`}
            />
          )}

          {/* Loop B indicator */}
          {loopB !== null && duration > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-1 bg-[#F59E0B] pointer-events-none rounded-full"
              style={{ left: `${(loopB / duration) * 100}%` }}
              title={`Loop B: ${formatTime(loopB)}`}
            />
          )}
        </div>

        {/* Buttons and Telemetry */}
        <div className="flex items-center justify-between text-white text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1 hover:text-[var(--cn-brand)] transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Frame Steppers */}
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
                  ensureAudioGraph();
                  setIsMuted(!isMuted);
                }}
                className="p-1 hover:text-[var(--cn-brand)] transition-colors"
              >
                {isMuted || volumePercent === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
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
            {/* Speed Selector */}
            <div className="flex items-center gap-1">
              <Gauge size={13} className="text-white/60 hidden sm:inline" />
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
              <Tv size={16} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 text-white/80 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
