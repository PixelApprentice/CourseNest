import { useState } from 'react';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Maximize, 
  Minimize, 
  X, 
  BookOpen,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

interface EmbeddedDocumentViewerProps {
  filename: string;
  fileSizeBytes?: number;
  description?: string;
  contentSnippet?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function EmbeddedDocumentViewer({
  filename,
  fileSizeBytes = 2400000,
  description = 'Course Lecture Handout & Slide Deck',
  contentSnippet,
  onClose,
  isModal = true,
}: EmbeddedDocumentViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>('preview');

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(200, Math.max(50, prev + delta)));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleDownload = () => {
    const blob = new Blob([contentSnippet || `# ${filename}\n\n${description}`], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const containerClasses = isModal
    ? 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8'
    : 'border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] overflow-hidden';

  const innerClasses = isModal
    ? `bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'h-screen max-w-none rounded-none' : 'max-w-5xl h-[85vh]'
      }`
    : 'flex flex-col h-[600px] w-full';

  return (
    <div className={containerClasses}>
      <div className={innerClasses}>
        {/* Header toolbar */}
        <div className="h-14 px-5 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm text-[var(--cn-text-primary)] truncate">{filename}</h3>
              <p className="text-[10px] font-mono text-[var(--cn-text-muted)]">
                {(fileSizeBytes / 1024 / 1024).toFixed(1)} MB • Offline Cached in Vault
              </p>
            </div>
          </div>

          {/* Action and Zoom Controls */}
          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="hidden sm:flex items-center bg-[var(--cn-bg)] p-0.5 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] font-semibold shadow-xs'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                Document Reader
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'text'
                    ? 'bg-[var(--cn-surface)] text-[var(--cn-primary)] font-semibold shadow-xs'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                Outline Notes
              </button>
            </div>

            {/* Zoom buttons */}
            <div className="hidden md:flex items-center gap-1 bg-[var(--cn-bg)] px-2 py-1 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
              <button
                onClick={() => handleZoom(-15)}
                className="p-1 hover:text-[var(--cn-primary)]"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="w-12 text-center text-[11px] font-medium">{zoomLevel}%</span>
              <button
                onClick={() => handleZoom(15)}
                className="p-1 hover:text-[var(--cn-primary)]"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 hover:text-[var(--cn-primary)] border-l border-[var(--cn-border)] pl-1.5 ml-1"
                title="Reset to 100%"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Download local file"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export</span>
            </button>

            {isModal && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)]"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>
            )}

            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] hover:bg-[var(--cn-surface-subtle)]"
                title="Close Reader (Esc)"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Viewport content */}
        <div className="flex-1 overflow-auto bg-[var(--cn-bg)] p-6 md:p-10 flex justify-center">
          {activeTab === 'preview' ? (
            <div
              className="bg-white text-zinc-900 rounded-xl shadow-2xl p-8 md:p-12 transition-all duration-150 origin-top flex flex-col justify-between"
              style={{
                width: `${Math.round(8.5 * 96 * (zoomLevel / 100))}px`,
                minHeight: `${Math.round(11 * 96 * (zoomLevel / 100))}px`,
              }}
            >
              {/* Top document academic header */}
              <div className="border-b-2 border-zinc-900 pb-4 mb-6">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600 uppercase tracking-wider mb-2">
                  <span>COURSENEST ACADEMIC REPOSITORY</span>
                  <span>VERIFIED OFFLINE HANDOUT</span>
                </div>
                <h1 className="text-2xl font-bold font-serif text-zinc-950 mb-1">
                  {filename.replace(/\.[^/.]+$/, '')}
                </h1>
                <p className="text-xs text-zinc-600 font-sans">{description}</p>
              </div>

              {/* Document Prose Content */}
              <div className="space-y-4 font-serif text-sm leading-relaxed text-zinc-800 flex-1">
                <div className="p-4 bg-zinc-50 border-l-4 border-emerald-600 rounded-r text-xs font-sans text-zinc-700">
                  <p className="font-semibold text-emerald-800 mb-0.5">Offline Document Sandbox</p>
                  This document was extracted from verified university archives into your local sandboxed vault. All diagrams, mathematical definitions, and reference code remain accessible without external connectivity.
                </div>

                <h3 className="font-sans font-bold text-sm text-zinc-900 pt-2">1. Architectural Invariants & Key Concepts</h3>
                <p>
                  In distributed and concurrent systems, maintaining safety invariants under partial network partitions requires deterministic ordering of operations. The state machine replication model ensures that identical inputs presented to replicas in the same sequence produce identical state transitions.
                </p>

                <h3 className="font-sans font-bold text-sm text-zinc-900 pt-2">2. Checkpoint Validation Procedure</h3>
                <p>
                  Prior to committing any transaction to disk, write-ahead logs must be flushed to persistent non-volatile storage. In air-gapped environments, atomic recovery managers guarantee that incomplete staging writes are automatically rolled back, preventing dangling pointers or orphaned blocks.
                </p>

                {contentSnippet && (
                  <div className="mt-4 p-4 bg-zinc-100 rounded-lg font-mono text-xs text-zinc-800 whitespace-pre-wrap">
                    {contentSnippet}
                  </div>
                )}
              </div>

              {/* Document Footer */}
              <div className="border-t border-zinc-200 pt-4 mt-8 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  SHA-256 Verified
                </span>
                <span>Page 1 of 1 • Air-Gapped Vault</span>
              </div>
            </div>
          ) : (
            /* Outline Notes View */
            <div className="max-w-2xl w-full p-6 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-4 h-fit">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cn-primary)] border-b border-[var(--cn-border)] pb-2">
                <BookOpen size={14} />
                <span>STRUCTURED HANDOUT OUTLINE</span>
              </div>
              <div className="prose prose-sm text-xs text-[var(--cn-text-secondary)] space-y-3 leading-relaxed">
                <p>• <strong>Primary Resource:</strong> {filename}</p>
                <p>• <strong>File Size:</strong> {(fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                <p>• <strong>Topic Coverage:</strong> Systems Architecture, Concurrency Invariants, and Fault Recovery</p>
                <p>• <strong>Recommended Study Duration:</strong> 25 minutes prior to checkpoint assessment</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="h-10 px-5 border-t border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between text-[11px] font-mono text-[var(--cn-text-muted)] shrink-0">
          <span className="flex items-center gap-1.5">
            <HardDrive size={12} className="text-[var(--cn-success)]" />
            Rendered from local application sandbox
          </span>
          <span>Press Esc to close reader</span>
        </div>
      </div>
    </div>
  );
}
