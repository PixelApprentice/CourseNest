import { useState } from 'react';
import { 
  IconBrandYoutube, 
  IconExternalLink, 
  IconCheck, 
  IconRefresh, 
  IconPlayerPlay 
} from '@tabler/icons-react';
import { getYouTubeEmbedUrl, extractYouTubeVideoId, getYouTubeThumbnailUrl } from '../lib/youtubeHelper';

interface YouTubePlayerProps {
  urlOrId: string;
  title: string;
  onEnded?: () => void;
  className?: string;
}

export function YouTubePlayer({
  urlOrId,
  title,
  onEnded,
  className = '',
}: YouTubePlayerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const videoId = extractYouTubeVideoId(urlOrId);
  const embedUrl = videoId ? getYouTubeEmbedUrl(videoId) : null;
  const thumbnailUrl = videoId ? getYouTubeThumbnailUrl(videoId) : null;

  if (!videoId || !embedUrl) {
    return (
      <div className={`aspect-video w-full rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] flex flex-col items-center justify-center p-6 text-center text-[var(--cn-text-muted)] ${className}`}>
        <IconBrandYoutube size={48} className="text-red-500/80 mb-3" />
        <h3 className="text-sm font-semibold text-[var(--cn-text-primary)]">Invalid YouTube Video Link</h3>
        <p className="text-xs text-[var(--cn-text-secondary)] mt-1 max-w-sm">
          Could not extract a valid YouTube video ID from: <code className="px-1.5 py-0.5 rounded bg-[var(--cn-surface-subtle)] text-[var(--cn-accent)] font-mono">{urlOrId}</code>
        </p>
      </div>
    );
  }

  const handleMarkDone = () => {
    setIsCompleted(true);
    if (onEnded) onEnded();
  };

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden border border-[var(--cn-border)] bg-[var(--cn-surface)] shadow-lg ${className}`}>
      {/* 16:9 Video Viewport */}
      <div className="relative aspect-video w-full bg-black overflow-hidden group">
        {!hasStarted && thumbnailUrl ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer" onClick={() => setHasStarted(true)}>
            <img 
              src={thumbnailUrl} 
              alt={title} 
              className="w-full h-full object-cover opacity-85 transition-opacity duration-300 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            
            {/* Play overlay button */}
            <button 
              className="absolute z-10 w-16 h-16 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-2xl transition-[transform,background-color] duration-200 hover:scale-110 active:scale-95"
              aria-label="Play YouTube Video"
            >
              <IconPlayerPlay size={28} className="fill-white translate-x-0.5" />
            </button>

            {/* Video metadata pill */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs z-10">
              <span className="font-medium truncate drop-shadow">{title}</span>
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1.5 shrink-0">
                <IconBrandYoutube size={13} className="text-red-500" />
                <span>YouTube In-App</span>
              </span>
            </div>
          </div>
        ) : (
          <iframe
            key={reloadKey}
            src={`${embedUrl}&autoplay=1`}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {/* Embedded Video Bar */}
      <div className="px-4 py-3 border-t border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[var(--cn-text-muted)]">
          <IconBrandYoutube size={16} className="text-red-500 shrink-0" />
          <span className="font-medium text-[var(--cn-text-primary)] truncate max-w-xs sm:max-w-md">
            {title}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 font-medium shrink-0">
            YouTube Stream
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] transition-colors"
            title="Reload Video Stream"
          >
            <IconRefresh size={14} />
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] transition-colors"
          >
            <span>Open in YouTube</span>
            <IconExternalLink size={13} />
          </a>

          <button
            onClick={handleMarkDone}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-[background-color,transform] duration-150 active:scale-95 ${
              isCompleted
                ? 'bg-emerald-600/20 text-emerald-600 border border-emerald-500/30'
                : 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] hover:bg-[var(--cn-primary-hover)] shadow-sm'
            }`}
          >
            <IconCheck size={14} />
            <span>{isCompleted ? 'Finished' : 'Mark Video Complete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
