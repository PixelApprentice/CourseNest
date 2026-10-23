import React, { useState } from 'react';
import { 
  IconX, 
  IconExternalLink, 
  IconCopy, 
  IconCheck, 
  IconRotate, 
  IconWorld, 
  IconMaximize, 
  IconMinimize 
} from '@tabler/icons-react';

export interface MiniWindowLinkModalProps {
  url: string;
  title?: string;
  onClose: () => void;
}

export const MiniWindowLinkModal: React.FC<MiniWindowLinkModalProps> = ({
  url,
  title,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={`bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-[width,height] duration-200 ease-out ${
          isExpanded 
            ? 'w-full h-full max-w-[98vw] max-h-[96vh]' 
            : 'w-full max-w-4xl h-[80vh]'
        }`}
      >
        {/* Browser Top Navigation Bar */}
        <div className="h-12 px-4 bg-[var(--cn-surface-subtle)] border-b border-[var(--cn-border)] flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Traffic Lights / Minimize / Maximize */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"
              title="Close Mini Window"
              aria-label="Close Mini Window"
            />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors"
              title={isExpanded ? 'Restore Size' : 'Maximize Window'}
              aria-label={isExpanded ? 'Restore Size' : 'Maximize Window'}
            />
          </div>

          {/* Mini Address Bar */}
          <div className="flex-1 max-w-xl mx-auto flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] text-xs font-mono text-[var(--cn-text-secondary)]">
            <IconWorld size={13} className="text-[var(--cn-primary)] shrink-0" />
            <span className="truncate flex-1 select-all">{url}</span>
            <button
              onClick={handleRefresh}
              className="p-0.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]"
              title="Reload Page"
              aria-label="Reload Page"
            >
              <IconRotate size={12} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Copy URL"
            >
              {copied ? <IconCheck size={13} className="text-[var(--cn-success)]" /> : <IconCopy size={13} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Open in Full Browser Tab"
            >
              <IconExternalLink size={13} />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] hover:text-[var(--cn-text-primary)] transition-colors"
              title={isExpanded ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isExpanded ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--cn-text-secondary)] hover:bg-red-500/20 hover:text-red-400 transition-colors ml-1"
              title="Close"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Browser Content Area */}
        <div className="flex-1 bg-white relative">
          <iframe
            key={iframeKey}
            src={url}
            title={title || 'Course Resource'}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="w-full h-full border-none"
          />

          {/* Sub-bar notice for sites blocking iframes */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-white/20 shadow-lg flex items-center gap-2 pointer-events-auto">
            <span>Reading within CourseNest</span>
            <span>•</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--cn-primary)] underline hover:text-white"
            >
              If site blocks embed, open in tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
