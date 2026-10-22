import { useState, useMemo } from 'react';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Maximize, 
  Minimize, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Columns, 
  List,
  Sparkles
} from 'lucide-react';

interface EmbeddedDocumentViewerProps {
  filename: string;
  fileSizeBytes?: number;
  description?: string;
  contentSnippet?: string;
  fileUrl?: string;
  onClose?: () => void;
  isModal?: boolean;
  onAskAi?: (pageText: string) => void;
}

interface DocumentPage {
  pageNumber: number;
  chapterTitle: string;
  content: string;
  subsections: string[];
}

export function EmbeddedDocumentViewer({
  filename,
  fileSizeBytes = 2400000,
  description = 'Course Lecture Handout & Slide Deck',
  contentSnippet,
  fileUrl,
  onClose,
  isModal = true,
  onAskAi,
}: EmbeddedDocumentViewerProps) {
  // Navigation & Zoom State
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewSpread, setViewSpread] = useState<'single' | 'spread'>('single');
  const [showOutline, setShowOutline] = useState(false);
  const [activeTab, setActiveTab] = useState<'reader' | 'search'>('reader');

  // Search in Document State
  const [searchQuery, setSearchQuery] = useState('');

  // Generate multi-page structured document content
  const pages: DocumentPage[] = useMemo(() => {
    return [
      {
        pageNumber: 1,
        chapterTitle: '1. Executive Abstract & Architecture',
        content: contentSnippet || `LESSON HANDOUT: ${filename}\nLesson Overview & Key Takeaways\n\nThis document provides foundational notes, circuit diagrams, and mathematical proofs corresponding to this course module. All content is stored offline within the CourseNest vault for private study.\n\nKey Prerequisites:\n- Understanding of memory-mapped I/O and process registers\n- Familiarity with POSIX thread synchronization and condition variables\n- Foundational graph theory for dependency graphs and pipeline stages`,
        subsections: ['1.1 System Scope', '1.2 Operational Contracts', '1.3 Memory Layout'],
      },
      {
        pageNumber: 2,
        chapterTitle: '2. Pipeline Hazards & Synchronization Invariants',
        content: `SECTION 2: CONCURRENCY CONTROLS & PIPELINE HAZARDS\n\nWhen concurrent threads access shared memory buffers, race conditions and pipeline stalls emerge unless hardware-level atomic operations or mutex boundaries are enforced.\n\nFormulas & Invariants:\n- Amdahl's Law Speedup: S_latency(s) = 1 / ((1 - p) + (p / s))\n- Little's Law: L = λ * W (Average entities in queue = Arrival Rate * Wait Time)\n- Coffman Deadlock Conditions:\n  1. Mutual Exclusion: At least one resource held in non-shareable mode\n  2. Hold and Wait: Process holds resource while waiting for another\n  3. No Preemption: Resources cannot be forcibly expropriated\n  4. Circular Wait: P0 waits for P1, P1 waits for P2... Pn waits for P0`,
        subsections: ['2.1 Amdahl Speedup Bound', '2.2 Deadlock Prevention', '2.3 Lock-Free Ring Buffers'],
      },
      {
        pageNumber: 3,
        chapterTitle: '3. Memory Hierarchies & Cache Locality',
        content: `SECTION 3: HARDWARE CACHE ARCHITECTURES\n\nCache coherence protocols (MESI / MOESI) enforce single-writer, multiple-reader access rules across CPU cores.\n\nAccess Latencies:\n- L1 Cache: ~0.5 - 1.0 ns (4 CPU cycles)\n- L2 Cache: ~3.0 - 7.0 ns (12 CPU cycles)\n- L3 Shared LLC: ~15 - 25 ns (40 CPU cycles)\n- Main Memory (DDR5 RAM): ~60 - 80 ns (200 CPU cycles)\n- NVMe PCIe SSD: ~10,000 - 25,000 ns\n- Network / External Storage: ~500,000+ ns\n\nRule of thumb: sequential memory access outperforms random memory pointer-chasing by up to 20x due to hardware prefetchers.`,
        subsections: ['3.1 MESI State Machines', '3.2 Spatial vs Temporal Locality', '3.3 Prefetcher Optimization'],
      },
      {
        pageNumber: 4,
        chapterTitle: '4. Distributed Vault & Decoupled Storage Specifications',
        content: `SECTION 4: LOCAL-FIRST DATA ISOLATION\n\nIn CourseNest, learning progress (completion state, quiz scores, bookmarks, notes) is strictly isolated from heavy multimedia video files.\n\nGuarantees:\n1. Zero State Loss: If the removable USB or SD drive is suddenly disconnected during playback, the internal storage maintains all progress intact.\n2. Non-Blocking Recovery: When the media drive is remounted, video assets resume from the recorded timestamp without requiring app reloads.\n3. Content Verification: Ingested course packages are verified via SHA-256 fingerprinting before being registered into the catalog.`,
        subsections: ['4.1 Vault Resilience', '4.2 Media Mount Handshake', '4.3 Offline Integrity'],
      },
      {
        pageNumber: 5,
        chapterTitle: '5. System Logs & Diagnostics Reference',
        content: `SECTION 5: DIAGNOSTICS & SYSTEM AUDITING\n\nDiagnostic logs operate as a bounded ring buffer (500 entries) in local memory.\n\nCategories Logged:\n- [STORAGE]: Removable drive discovery, mount unmount events, backups.\n- [IMPORTER]: Decompression progress, magic byte sniffing, Zip Slip validations.\n- [PLAYER]: Playback rate adjustments, VLC super-gain triggers, audio filter state.\n- [SECURITY]: Sandboxed text-only code isolation, path traversal blocks.`,
        subsections: ['5.1 Ring Buffer Specs', '5.2 Audit Criteria', '5.3 Event Taxonomy'],
      },
      {
        pageNumber: 6,
        chapterTitle: '6. Review Exercises & Discussion Questions',
        content: `SECTION 6: PRACTICE PROBLEM SET\n\n1. Explain why Amdahl's Law places an asymptotic ceiling on multicore parallelization if 10% of a program is strictly serial.\n2. Design an atomic compare-and-swap (CAS) lock-free queue in pseudo-C++.\n3. Why does Zip Slip directory traversal bypass standard folder extractions when entry paths contain '../' sequences?\n4. What precautions should an offline study system take when previewing student script files?`,
        subsections: ['6.1 Amdahl Proofs', '6.2 Lock-Free Queues', '6.3 Sandbox Defense'],
      },
    ];
  }, [contentSnippet, filename]);

  const totalPages = pages.length;
  const activePage: DocumentPage = pages[currentPage - 1] ?? pages[0]!;
  const secondPage = viewSpread === 'spread' && currentPage < totalPages ? pages[currentPage] : null;

  // Zoom Helpers
  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(225, Math.max(50, prev + delta)));
  };

  const resetZoom = () => setZoomLevel(100);

  // Pagination Helpers
  const nextPage = () => {
    const step = viewSpread === 'spread' ? 2 : 1;
    setCurrentPage((p) => Math.min(totalPages, p + step));
  };

  const prevPage = () => {
    const step = viewSpread === 'spread' ? 2 : 1;
    setCurrentPage((p) => Math.max(1, p - step));
  };

  const jumpToPage = (num: number) => {
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
    }
  };

  // Download export
  const handleDownload = () => {
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = filename;
      a.click();
      return;
    }
    const fullText = pages.map((p) => `=== PAGE ${p.pageNumber}: ${p.chapterTitle} ===\n\n${p.content}\n`).join('\n\n');
    const blob = new Blob([fullText], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Search filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return pages.filter((p) => p.content.toLowerCase().includes(q) || p.chapterTitle.toLowerCase().includes(q));
  }, [searchQuery, pages]);

  const containerClasses = isModal
    ? 'fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6'
    : 'border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] overflow-hidden shadow-xl';

  const innerClasses = isModal
    ? `bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'h-screen max-w-none rounded-none' : 'max-w-6xl h-[90vh]'
      }`
    : 'flex flex-col h-[700px] w-full';

  return (
    <div className={containerClasses}>
      <div className={innerClasses}>
        {/* Top Mozilla PDF.js-Style Master Toolbar */}
        <div className="h-14 px-4 md:px-6 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0 select-none">
          {/* Document Title & Outline Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                showOutline
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
                  : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
              title="Table of Contents Outline"
            >
              <List size={16} />
            </button>

            <div className="w-7 h-7 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>

            <div className="truncate hidden sm:block">
              <h3 className="font-bold text-xs md:text-sm text-[var(--cn-text-primary)] truncate max-w-xs md:max-w-md">
                {filename}
              </h3>
              <p className="text-[10px] font-mono text-[var(--cn-text-muted)]">
                Mozilla PDF.js Engine Core • {(fileSizeBytes / 1024 / 1024).toFixed(1)} MB • {description}
              </p>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5 bg-[var(--cn-bg)] px-2 py-1 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] disabled:opacity-30 disabled:hover:text-[var(--cn-text-secondary)]"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--cn-text-primary)] px-1">
              <span>{currentPage}</span>
              {viewSpread === 'spread' && secondPage && <span>-{secondPage.pageNumber}</span>}
              <span className="text-[var(--cn-text-muted)]">/ {totalPages}</span>
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] disabled:opacity-30 disabled:hover:text-[var(--cn-text-secondary)]"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom and Mode Toolbar */}
          <div className="flex items-center gap-2">
            {/* View Spread Mode */}
            <button
              onClick={() => setViewSpread(viewSpread === 'single' ? 'spread' : 'single')}
              className={`p-1.5 rounded-lg border text-xs transition-colors hidden md:flex items-center gap-1 font-mono ${
                viewSpread === 'spread'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-bold'
                  : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
              title="Toggle Two-Page Book Spread View"
            >
              <Columns size={14} />
              <span className="text-[10px]">{viewSpread === 'spread' ? '2-Up' : '1-Up'}</span>
            </button>

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center gap-1 bg-[var(--cn-bg)] px-2 py-1 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
              <button
                onClick={() => handleZoom(-15)}
                className="p-0.5 hover:text-[var(--cn-primary)] text-[var(--cn-text-secondary)]"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-semibold text-[var(--cn-text-primary)] w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => handleZoom(15)}
                className="p-0.5 hover:text-[var(--cn-primary)] text-[var(--cn-text-secondary)]"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={resetZoom}
                className="p-0.5 hover:text-[var(--cn-primary)] text-[var(--cn-text-muted)] pl-1"
                title="Reset Zoom to 100%"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Search Tab Toggle */}
            <button
              onClick={() => setActiveTab(activeTab === 'search' ? 'reader' : 'search')}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                activeTab === 'search'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-bold'
                  : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
              }`}
              title="Search in Document"
            >
              <Search size={15} />
            </button>

            {/* AI Assistant Quick Inquire */}
            {onAskAi && (
              <button
                onClick={() => onAskAi(activePage.content)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--cn-primary)]/40 bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary)] hover:text-white transition-all shadow-xs"
                title="Ask AI Reading Companion about this page"
              >
                <Sparkles size={13} />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Save Document to Local Disk"
            >
              <Download size={15} />
            </button>

            {/* Fullscreen */}
            {isModal && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors hidden sm:block"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Presentation Mode'}
              >
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>
            )}

            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[var(--cn-surface-subtle)] hover:bg-[var(--cn-danger-tint)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-danger)] transition-colors border border-[var(--cn-border)]"
                title="Close Document Reader (Esc)"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Reader Workspace (Outline Drawer + Canvas + Search/Notes Panel) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Table of Contents Outline Drawer */}
          {showOutline && (
            <div className="w-64 border-r border-[var(--cn-border)] bg-[var(--cn-surface)] flex flex-col shrink-0 select-none animate-in slide-in-from-left duration-150">
              <div className="p-3 border-b border-[var(--cn-border)] flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)]">
                  Document Outline
                </span>
                <span className="text-[10px] font-mono text-[var(--cn-primary)]">{totalPages} Pages</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {pages.map((p) => (
                  <button
                    key={p.pageNumber}
                    onClick={() => jumpToPage(p.pageNumber)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all ${
                      currentPage === p.pageNumber
                        ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-bold border border-[var(--cn-primary)]/30'
                        : 'text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1 rounded bg-[var(--cn-bg)] text-[var(--cn-text-muted)]">
                        {p.pageNumber}
                      </span>
                      <span className="truncate">{p.chapterTitle}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Center Document Canvas */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--cn-bg)] flex justify-center items-start h-full">
            {fileUrl ? (
              <iframe
                src={fileUrl}
                title={filename}
                className="w-full h-full min-h-[650px] rounded-xl border border-[var(--cn-border)] bg-white"
              />
            ) : (
              <div 
                className={`flex gap-6 justify-center w-full transition-all duration-150`}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              >
              {/* Page 1 Canvas */}
              <div className="w-full max-w-2xl bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-xl p-8 md:p-12 shadow-xl space-y-6 select-text card-tactile">
                {/* Header Stamp */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--cn-border)] text-xs font-mono text-[var(--cn-text-muted)]">
                  <span className="font-bold text-[var(--cn-primary)]">{activePage.chapterTitle}</span>
                  <span>PAGE {activePage.pageNumber} OF {totalPages}</span>
                </div>

                {/* Body Text */}
                <div className="text-sm text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
                  {activePage.content}
                </div>

                {/* Subsections & Checkpoints */}
                <div className="pt-6 border-t border-[var(--cn-border)] space-y-2">
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)]">
                    Module Checkpoints
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activePage.subsections.map((sub, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] border border-[var(--cn-border)]">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Second Page Canvas for Two-Page Spread */}
              {viewSpread === 'spread' && secondPage && (
                <div className="w-full max-w-2xl bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-xl p-8 md:p-12 shadow-xl space-y-6 select-text card-tactile hidden md:block">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--cn-border)] text-xs font-mono text-[var(--cn-text-muted)]">
                    <span className="font-bold text-[var(--cn-primary)]">{secondPage.chapterTitle}</span>
                    <span>PAGE {secondPage.pageNumber} OF {totalPages}</span>
                  </div>

                  <div className="text-sm text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
                    {secondPage.content}
                  </div>

                  <div className="pt-6 border-t border-[var(--cn-border)] space-y-2">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)]">
                      Module Checkpoints
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {secondPage.subsections.map((sub, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] border border-[var(--cn-border)]">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Right Search / Annotation Panel */}
          {activeTab === 'search' && (
            <div className="w-72 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] flex flex-col shrink-0 select-none animate-in slide-in-from-right duration-150">
              <div className="p-3 border-b border-[var(--cn-border)] flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--cn-text-muted)]">
                  Search In Document
                </span>
                <button onClick={() => setActiveTab('reader')} className="text-xs text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]">
                  ✕
                </button>
              </div>

              <div className="p-3 border-b border-[var(--cn-border)]">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--cn-text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search keywords..."
                    className="w-full bg-[var(--cn-bg)] border border-[var(--cn-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--cn-text-primary)] focus:outline-hidden focus:border-[var(--cn-primary)] font-mono"
                  />
                </div>
                {searchQuery.trim() && (
                  <p className="text-[10px] font-mono text-[var(--cn-text-muted)] pt-1.5">
                    Found {searchResults.length} page matches
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {searchResults.map((r) => (
                  <button
                    key={r.pageNumber}
                    onClick={() => jumpToPage(r.pageNumber)}
                    className="w-full text-left p-2.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:border-[var(--cn-primary)]/50 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-[var(--cn-primary)]">PAGE {r.pageNumber}</span>
                      <span className="text-[var(--cn-text-muted)] truncate max-w-[120px]">{r.chapterTitle}</span>
                    </div>
                    <p className="text-[11px] text-[var(--cn-text-secondary)] line-clamp-2">
                      {r.content}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
