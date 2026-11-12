import { useState, useMemo, useEffect } from 'react';
import { getSavedReadingPage, saveReadingPage } from '../lib/courseStore';
import { 
  IconFileText, 
  IconZoomIn, 
  IconZoomOut, 
  IconRotate, 
  IconDownload, 
  IconMaximize, 
  IconMinimize, 
  IconX, 
  IconSearch, 
  IconChevronLeft, 
  IconChevronRight, 
  IconColumns, 
  IconList,
  IconBrain,
  IconBooks,
  IconLayoutColumns
} from '@tabler/icons-react';

interface EmbeddedDocumentViewerProps {
  filename: string;
  fileSizeBytes?: number;
  description?: string;
  contentSnippet?: string;
  fileUrl?: string;
  courseId?: string;
  lessonId?: string;
  onClose?: () => void;
  isModal?: boolean;
  onAskAi?: (pageText: string) => void;
  onToggleDock?: () => void;
  isDocked?: boolean;
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
  courseId = '',
  lessonId = '',
  onClose,
  isModal = true,
  onAskAi,
  onToggleDock,
  isDocked = false,
}: EmbeddedDocumentViewerProps) {
  // Navigation & Zoom State
  const [currentPage, setCurrentPage] = useState(() => {
    if (lessonId) {
      return getSavedReadingPage(lessonId, courseId);
    }
    return 1;
  });
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
        chapterTitle: '1. Course Handout & Key Takeaways',
        content: contentSnippet || `COURSE MATERIAL: ${filename}\nModule Overview & Learning Objectives\n\nWelcome to this learning unit. This document contains supplementary readings, key concepts, and reference materials designed to accompany the lecture.\n\nKey Objectives:\n- Review fundamental ideas presented in the video lecture\n- Connect practical examples to broader course goals\n- Complete the self-check exercises at the end of this handout`,
        subsections: ['1.1 Overview', '1.2 Learning Objectives', '1.3 Reading Guide'],
      },
      {
        pageNumber: 2,
        chapterTitle: '2. Core Concepts & Foundations',
        content: `SECTION 2: CORE CONCEPTS & THEORETICAL PRINCIPLES\n\nMastering foundational ideas is essential before tackling advanced problem sets. Take time to reflect on each core principle.\n\nKey Principles:\n- Structured Study: Break complex topics into manageable daily study sessions.\n- Active Recall: Test your knowledge immediately after watching lectures.\n- Spaced Repetition: Revisit difficult notes periodically to solidify long-term retention.\n- Hands-on Practice: Apply theoretical concepts through exercises and projects.`,
        subsections: ['2.1 Structured Study', '2.2 Active Recall', '2.3 Spaced Repetition'],
      },
      {
        pageNumber: 3,
        chapterTitle: '3. Practical Applications & Examples',
        content: `SECTION 3: PRACTICAL APPLICATIONS & WORKED EXAMPLES\n\nIn this section, we examine real-world case studies and practical scenarios that illustrate how these techniques apply in practice.\n\nRecommended Steps:\n1. Analyze the initial problem statement carefully.\n2. Identify key variables and constraints.\n3. Formulate a step-by-step solution strategy.\n4. Verify your solution against known edge cases.`,
        subsections: ['3.1 Problem Analysis', '3.2 Solution Strategy', '3.3 Verification'],
      },
      {
        pageNumber: 4,
        chapterTitle: '4. Summary & Review Notes',
        content: `SECTION 4: MODULE SUMMARY & REVIEW NOTES\n\nSummary of important takeaways from this lesson:\n\n1. Review: Review all highlighted definitions and equations.\n2. Notes: Keep your personal study notes updated in the course notebook.\n3. Preparation: Prepare any questions you may have for upcoming discussion sessions.`,
        subsections: ['4.1 Summary', '4.2 Study Notes', '4.3 Next Steps'],
      },
      {
        pageNumber: 5,
        chapterTitle: '5. Self-Assessment & Discussion Questions',
        content: `SECTION 5: PRACTICE QUESTIONS & EXERCISES\n\n1. Explain the primary concept covered in this module in your own words.\n2. How does the topic discussed in this unit connect to the previous chapter?\n3. What are two practical situations where this knowledge applies?\n4. What questions remain unanswered that you want to explore further?`,
        subsections: ['5.1 Self-Check', '5.2 Practice Exercises', '5.3 Discussion'],
      },
    ];
  }, [contentSnippet, filename]);

  const totalPages = pages.length;
  const activePage: DocumentPage = pages[currentPage - 1] ?? pages[0]!;
  const secondPage = viewSpread === 'spread' && currentPage < totalPages ? pages[currentPage] : null;

  // Persist reading position
  useEffect(() => {
    if (lessonId && currentPage > 0) {
      saveReadingPage(lessonId, currentPage, courseId, totalPages);
    }
  }, [currentPage, lessonId, courseId, totalPages]);

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
    : 'w-full h-full flex flex-col bg-[var(--cn-surface)] overflow-hidden';

  const innerClasses = isModal
    ? `bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden transition-[width,height,border-radius] duration-200 ease-out ${
        isFullscreen ? 'h-screen max-w-none rounded-none' : 'max-w-6xl h-[90vh]'
      }`
    : 'flex flex-col h-full w-full';

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
              <IconList size={16} />
            </button>

            <div className="w-7 h-7 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center shrink-0">
              <IconFileText size={16} />
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
              <IconChevronLeft size={16} />
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
              <IconChevronRight size={16} />
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
              <IconColumns size={14} />
              <span className="text-[10px]">{viewSpread === 'spread' ? '2-Up' : '1-Up'}</span>
            </button>

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center gap-1 bg-[var(--cn-bg)] px-2 py-1 rounded-lg border border-[var(--cn-border)] text-xs font-mono">
              <button
                onClick={() => handleZoom(-15)}
                className="p-0.5 hover:text-[var(--cn-primary)] text-[var(--cn-text-secondary)]"
                title="Zoom Out"
              >
                <IconZoomOut size={14} />
              </button>
              <span className="text-[10px] font-semibold text-[var(--cn-text-primary)] w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => handleZoom(15)}
                className="p-0.5 hover:text-[var(--cn-primary)] text-[var(--cn-text-secondary)]"
                title="Zoom In"
              >
                <IconZoomIn size={14} />
              </button>
              <button
                onClick={resetZoom}
                className="p-0.5 hover:text-[var(--cn-primary)] text-[var(--cn-text-muted)] pl-1"
                title="Reset Zoom to 100%"
              >
                <IconRotate size={12} />
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
              <IconSearch size={15} />
            </button>

            {/* AI Assistant Quick Inquire */}
            {onAskAi && (
              <button
                onClick={() => onAskAi(activePage.content)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--cn-primary)]/40 bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary)] hover:text-white transition-[background-color,color,transform] duration-150 ease-out active:scale-95 shadow-xs"
                title="Ask Reading Companion about this page"
              >
                <IconBrain size={13} />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors"
              title="Save Document to Local Disk"
            >
              <IconDownload size={15} />
            </button>

            {/* Dock / Undock Workbench Toggle */}
            {onToggleDock && (
              <button
                onClick={onToggleDock}
                className={`p-1.5 rounded-lg border border-[var(--cn-border)] transition-colors ${
                  isDocked
                    ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-bold'
                    : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)]'
                }`}
                title={isDocked ? 'Maximize to Full View' : 'Dock Side-by-Side (Split Workbench)'}
              >
                <IconLayoutColumns size={15} />
              </button>
            )}

            {/* Fullscreen */}
            {isModal && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors hidden sm:block"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Presentation Mode'}
              >
                {isFullscreen ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
              </button>
            )}

            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[var(--cn-surface-subtle)] hover:bg-[var(--cn-danger-tint)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-danger)] transition-colors border border-[var(--cn-border)]"
                title="Close Document Reader (Esc)"
              >
                <IconX size={16} />
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
                    className={`w-full text-left p-2 rounded-lg text-xs transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[0.99] ${
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
            {fileUrl && (filename.toLowerCase().endsWith('.pdf') || !filename.includes('.')) ? (
              <iframe
                src={fileUrl}
                title={filename}
                className="w-full h-full min-h-[650px] rounded-xl border border-[var(--cn-border)] bg-white"
              />
            ) : fileUrl && filename.toLowerCase().endsWith('.epub') ? (
              <div className="w-full max-w-xl p-8 rounded-2xl bg-[var(--cn-surface)] border border-[var(--cn-border)] text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] mx-auto flex items-center justify-center">
                  <IconBooks size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[var(--cn-text-primary)]">{filename}</h4>
                  <p className="text-xs text-[var(--cn-text-muted)] font-mono mt-1">
                    EPUB eBook Handout • Stored safely offline in media vault
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 rounded-xl bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-sm"
                >
                  Export EPUB File
                </button>
              </div>
            ) : (
              <div 
                className={`flex gap-6 justify-center w-full transition-[transform] duration-150 ease-out`}
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
                  <IconSearch size={14} className="absolute left-2.5 top-2.5 text-[var(--cn-text-muted)]" />
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
