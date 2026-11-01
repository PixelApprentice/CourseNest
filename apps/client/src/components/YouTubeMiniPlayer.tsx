import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayback } from '../lib/playbackStore';
import { 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconVolume, 
  IconVolumeOff, 
  IconMaximize, 
  IconX,
  IconDeviceTv
} from '@tabler/icons-react';

export const YouTubeMiniPlayer: React.FC = () => {
  const { playback, shouldShowMiniPlayer, togglePlay, toggleMute, dismiss } = usePlayback();
  const navigate = useNavigate();
  const location = useLocation();

  if (!shouldShowMiniPlayer || !playback) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = playback.duration > 0
    ? Math.min(100, Math.max(0, (playback.currentTime / playback.duration) * 100))
    : 0;

  const handleExpand = () => {
    const targetUrl = `/course/${playback.courseId}/lesson/${playback.lessonId}`;
    if (location.pathname === targetUrl) {
      // In lesson page: scroll back to top to reveal main player
      const scroller = document.getElementById('lesson-scroll-viewport');
      if (scroller) {
        scroller.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Navigated away: navigate back to lesson
      navigate(targetUrl);
    }
  };

  return (
    <div 
      className="fixed bottom-5 right-5 z-40 w-72 sm:w-84 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 backdrop-blur-md"
      role="region"
      aria-label="Picture in picture mini media player"
    >
      {/* Top Media Bar with Animated Audio Equalizer */}
      <div className="relative aspect-video w-full bg-black/90 flex flex-col justify-between p-3 overflow-hidden group">
        {/* Scrubber progress at very top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-[var(--cn-primary)] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Overlay: Equalizer & Close */}
        <div className="flex items-center justify-between z-10">
          {/* YouTube-style Live Audio Equalizer Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-mono text-[var(--cn-primary)] border border-white/10">
            {/* Animated Equalizer Waves */}
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-[var(--cn-primary)] rounded-full animate-pulse h-2" />
              <span className="w-0.5 bg-[var(--cn-primary)] rounded-full animate-pulse h-3 [animation-delay:150ms]" />
              <span className="w-0.5 bg-[var(--cn-primary)] rounded-full animate-pulse h-1.5 [animation-delay:300ms]" />
              <span className="w-0.5 bg-[var(--cn-primary)] rounded-full animate-pulse h-2.5 [animation-delay:450ms]" />
            </span>
            <span className="font-semibold tracking-wide">NOW PLAYING</span>
          </div>

          <button
            onClick={dismiss}
            title="Close Miniplayer"
            className="p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-colors"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Center Clickable Action to Expand */}
        <div 
          onClick={handleExpand}
          className="my-auto flex flex-col items-center justify-center cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xs flex items-center justify-center text-white mb-1 shadow-md hover:scale-105 transition-transform">
            <IconDeviceTv size={20} />
          </div>
          <span className="text-[11px] font-mono text-white/90 font-medium">Click to Expand</span>
        </div>

        {/* Timestamp Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-white/70 z-10">
          <span>{formatTime(playback.currentTime)}</span>
          <span>{formatTime(playback.duration)}</span>
        </div>
      </div>

      {/* Control Strip */}
      <div className="p-3 flex items-center justify-between gap-2 bg-[var(--cn-surface)] border-t border-[var(--cn-border)]">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={handleExpand}>
          <p className="text-[10px] font-mono font-semibold text-[var(--cn-primary)] uppercase truncate">
            {playback.courseTitle}
          </p>
          <h4 className="text-xs font-bold text-[var(--cn-text-primary)] truncate">
            {playback.lessonTitle}
          </h4>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
            title={playback.isMuted ? 'Unmute' : 'Mute'}
          >
            {playback.isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
          </button>

          <button
            onClick={togglePlay}
            className="p-2 rounded-xl bg-[var(--cn-primary)] text-[var(--cn-primary-text)] hover:opacity-90 active:scale-95 transition-[transform,opacity] shadow-xs"
            title={playback.isPlaying ? 'Pause' : 'Play'}
          >
            {playback.isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
          </button>

          <button
            onClick={handleExpand}
            className="p-1.5 rounded-lg text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
            title="Expand to Full Player"
          >
            <IconMaximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
