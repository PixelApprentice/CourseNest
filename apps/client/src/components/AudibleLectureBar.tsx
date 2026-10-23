import React from 'react';
import { 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconPlayerStop, 
  IconX
} from '@tabler/icons-react';
import { useAudible } from '../lib/audibleSuite';

export interface AudibleLectureBarProps {
  title?: string;
  textToRead: string;
  className?: string;
  onDismiss?: () => void;
}

export const AudibleLectureBar: React.FC<AudibleLectureBarProps> = ({
  title = 'Lesson Handout & Notes',
  textToRead,
  className = '',
  onDismiss,
}) => {
  const {
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
  } = useAudible();

  const handleTogglePlay = () => {
    playChime('click');
    if (isSpeaking && !isPaused) {
      pause();
    } else if (isSpeaking && isPaused) {
      resume();
    } else {
      speak(textToRead);
    }
  };

  const handleStop = () => {
    playChime('click');
    stop();
  };

  const speedOptions = [0.85, 1.0, 1.25, 1.5, 1.75];

  return (
    <div
      className={`border border-[var(--cn-border)] bg-[var(--cn-surface)] rounded-2xl p-3.5 shadow-sm transition-[box-shadow,border-color] duration-150 ${className}`}
      role="region"
      aria-label="Audible Lecture Narration Player"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={handleTogglePlay}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
              isSpeaking && !isPaused
                ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] ring-2 ring-[var(--cn-primary)]/30'
                : 'bg-[var(--cn-surface-subtle)] text-[var(--cn-primary)] border border-[var(--cn-border)] hover:bg-[var(--cn-primary-tint)]/20'
            }`}
            title={isSpeaking && !isPaused ? 'Pause Audible Narration' : 'Listen Aloud (Audible TTS)'}
            aria-label={isSpeaking && !isPaused ? 'Pause Audible Narration' : 'Listen Aloud (Audible TTS)'}
          >
            {isSpeaking && !isPaused ? (
              <IconPlayerPause size={17} />
            ) : (
              <IconPlayerPlay size={17} className="ml-0.5" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-mono text-[var(--cn-text-primary)] truncate">
                Audible Narration
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-semibold shrink-0">
                TTS
              </span>
            </div>
            <p className="text-[11px] text-[var(--cn-text-muted)] truncate font-mono">
              {isSpeaking && !isPaused
                ? `Narrating: ${title}...`
                : isSpeaking && isPaused
                  ? 'Narration paused'
                  : `Listen to ${title} like an audiobook`}
            </p>
          </div>
        </div>

        {/* Center: Live Audio Waveform Animation (Composite-only pure CSS) */}
        {isSpeaking && !isPaused && (
          <div className="hidden sm:flex items-center gap-1 h-5 px-3 rounded-full bg-[var(--cn-bg)] border border-[var(--cn-border)]">
            <span className="w-1 h-3 rounded-full bg-[var(--cn-primary)] animate-pulse" />
            <span className="w-1 h-4 rounded-full bg-[var(--cn-primary)] animate-pulse delay-75" />
            <span className="w-1 h-2 rounded-full bg-[var(--cn-primary)] animate-pulse delay-150" />
            <span className="w-1 h-5 rounded-full bg-[var(--cn-primary)] animate-pulse delay-100" />
            <span className="w-1 h-3 rounded-full bg-[var(--cn-primary)] animate-pulse delay-200" />
            <span className="text-[10px] font-mono font-bold text-[var(--cn-primary)] ml-1">PLAYING</span>
          </div>
        )}

        {/* Right: Controls & Speed Selector */}
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={handleStop}
              className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Stop Narration"
              aria-label="Stop Narration"
            >
              <IconPlayerStop size={15} />
            </button>
          )}

          {/* Speed Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] text-[10px] font-mono">
            {speedOptions.map((sp) => (
              <button
                key={sp}
                onClick={() => {
                  setRate(sp);
                  playChime('click');
                  if (isSpeaking) {
                    stop();
                    setTimeout(() => speak(textToRead), 50);
                  }
                }}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  rate === sp
                    ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-bold'
                    : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          {/* Voice Selector */}
          {voices.length > 1 && (
            <select
              value={selectedVoiceURI}
              onChange={(e) => {
                setSelectedVoiceURI(e.target.value);
                if (isSpeaking) {
                  stop();
                  setTimeout(() => speak(textToRead), 50);
                }
              }}
              className="hidden md:block max-w-[140px] px-2 py-1 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-[11px] font-mono text-[var(--cn-text-secondary)] truncate focus:outline-none"
              title="Select Speech Voice"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}

          {onDismiss && (
            <button
              onClick={() => {
                stop();
                onDismiss();
              }}
              className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Close Audible Bar"
              aria-label="Close Audible Bar"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
