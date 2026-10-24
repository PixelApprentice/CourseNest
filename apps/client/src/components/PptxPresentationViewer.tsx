import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { 
  IconPresentation, 
  IconChevronLeft, 
  IconChevronRight, 
  IconMaximize, 
  IconMinimize, 
  IconX, 
  IconVolume, 
  IconBrain, 
  IconLayoutGrid, 
  IconNotes,
  IconCheck
} from '@tabler/icons-react';
import { speakNarration, stopNarration } from '../lib/audibleSuite';

export interface PptxSlide {
  slideNumber: number;
  title: string;
  bullets: string[];
  notes?: string;
  codeSnippet?: string;
}

interface PptxPresentationViewerProps {
  filename?: string;
  fileSizeBytes?: number;
  fileBlob?: Blob | ArrayBuffer | string;
  initialSlides?: PptxSlide[];
  onClose?: () => void;
  isModal?: boolean;
  onAskAi?: (slideContent: string) => void;
}

const DEFAULT_DEMO_SLIDES: PptxSlide[] = [
  {
    slideNumber: 1,
    title: 'CS 101: Systems Programming & Memory Architectures',
    bullets: [
      'Undergraduate Systems Engineering Curriculum',
      'Physical realities of CPU registers, cache levels, and RAM latencies',
      'Bridging the Von Neumann memory wall in modern multiprocessors',
      'Presented by Faculty of Computer Science'
    ],
    notes: 'Welcome students to Lecture 1. Emphasize that while software abstractions look flat, physical silicon has dramatic latency deltas.'
  },
  {
    slideNumber: 2,
    title: 'The Modern Memory Hierarchy: Orders of Magnitude',
    bullets: [
      'CPU Registers: < 0.5 ns (1 clock cycle) — Immediate silicon access',
      'L1 Cache: ~1.0 ns (4 clock cycles) — Per-core private SRAM',
      'L2 Cache: ~4.0 ns (12 clock cycles) — Larger per-core SRAM buffer',
      'L3 Shared LLC: ~15 - 25 ns (40 cycles) — Shared multicore pool',
      'DDR5 Main RAM: ~60 - 100 ns (200 cycles) — Off-chip capacitive DRAM',
      'PCIe 5.0 NVMe SSD: ~10,000 ns — Flash block controllers'
    ],
    notes: 'Key takeaway: Accessing main RAM is 200x slower than L1 cache. Cache lines transfer 64 bytes at a time.'
  },
  {
    slideNumber: 3,
    title: 'Spatial vs. Temporal Locality Principles',
    bullets: [
      'Temporal Locality: Memory referenced recently is highly likely to be referenced again soon (e.g. loop counters, stack pointers).',
      'Spatial Locality: Memory adjacent to recently referenced addresses is likely to be accessed next.',
      'Hardware Prefetchers detect sequential stride patterns and preemptively fill L1/L2 caches.',
      'Matrix traversal order: Row-major access in C matches layout; column-major access causes compulsory cache misses.'
    ],
    codeSnippet: `// High spatial locality (Row-major in C):\nfor (int r = 0; r < ROWS; r++) {\n    for (int c = 0; c < COLS; c++) {\n        sum += matrix[r][c]; // Sequential 64-byte lines\n    }\n}`,
    notes: 'Walk students through the stride benchmark on the board.'
  },
  {
    slideNumber: 4,
    title: 'Virtual Memory & Multi-Level Page Tables',
    bullets: [
      'Decouples process logical address space from physical RAM frames.',
      'Translation Lookaside Buffer (TLB): High-speed hardware cache of page translations.',
      'Page Fault Handling: OS traps to kernel mode, initiates DMA from swap/disk, and updates page table.',
      'Hardware Page Walkers resolve multi-level tables (e.g., 4-level PML4 in x86-64).'
    ],
    notes: 'Explain why 64-bit architectures require multi-level paging rather than a single flat table.'
  },
  {
    slideNumber: 5,
    title: 'Concurrency Invariants & Synchronization Barriers',
    bullets: [
      'Race Conditions occur on simultaneous unsynchronized write access to shared state.',
      'Amdahl’s Law sets an asymptotic limit on speedup: S(s) = 1 / ((1 - p) + p/s).',
      'Mutual exclusion must prevent deadlock by eliminating circular wait conditions.',
      'Lock-Free atomic operations utilize CPU Compare-And-Swap (CAS) instructions.'
    ],
    notes: 'Recap for next week lab assignment: Thread barrier synchronization.'
  }
];

export function PptxPresentationViewer({
  filename = 'Lecture_Presentation_Slides.pptx',
  fileSizeBytes = 3500000,
  fileBlob,
  initialSlides,
  onClose,
  isModal = true,
  onAskAi,
}: PptxPresentationViewerProps) {
  const [slides, setSlides] = useState<PptxSlide[]>(initialSlides || DEFAULT_DEMO_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Parse real PPTX ZIP file if provided
  useEffect(() => {
    if (!fileBlob) return;

    let isMounted = true;
    setIsLoading(true);

    async function parsePptx(blobOrData: Blob | ArrayBuffer | string) {
      try {
        let arrayBuffer: ArrayBuffer;
        if (typeof blobOrData === 'string') {
          const res = await fetch(blobOrData);
          arrayBuffer = await res.arrayBuffer();
        } else if (blobOrData instanceof Blob) {
          arrayBuffer = await blobOrData.arrayBuffer();
        } else {
          arrayBuffer = blobOrData;
        }

        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles = Object.keys(zip.files)
          .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0], 10);
            const numB = parseInt(b.match(/\d+/)![0], 10);
            return numA - numB;
          });

        if (slideFiles.length === 0) {
          setIsLoading(false);
          return;
        }

        const parsed: PptxSlide[] = [];

        for (let i = 0; i < slideFiles.length; i++) {
          const slideFileName = slideFiles[i];
          if (!slideFileName || !zip.files[slideFileName]) continue;
          const xmlContent = await zip.files[slideFileName]!.async('string');
          
          // Basic DOM parsing of slide XML text nodes (<a:t>)
          const parser = new DOMParser();
          const doc = parser.parseFromString(xmlContent, 'application/xml');
          const paragraphs = Array.from(doc.getElementsByTagNameNS('*', 'p'));

          let slideTitle = `Slide ${i + 1}`;
          const bullets: string[] = [];

          paragraphs.forEach((p, pIdx) => {
            const textNodes = Array.from(p.getElementsByTagNameNS('*', 't'));
            const text = textNodes.map((t) => t.textContent || '').join('').trim();
            if (!text) return;

            if (pIdx === 0 && text.length < 120) {
              slideTitle = text;
            } else {
              bullets.push(text);
            }
          });

          // Check for notes slide
          let notes: string | undefined = undefined;
          const notesFileName = `ppt/notesSlides/notesSlide${i + 1}.xml`;
          if (zip.files[notesFileName]) {
            const notesXml = await zip.files[notesFileName]!.async('string');
            const notesDoc = parser.parseFromString(notesXml, 'application/xml');
            const notesTexts = Array.from(notesDoc.getElementsByTagNameNS('*', 't'))
              .map((t) => t.textContent || '')
              .join(' ')
              .trim();
            if (notesTexts) notes = notesTexts;
          }

          parsed.push({
            slideNumber: i + 1,
            title: slideTitle,
            bullets: bullets.length > 0 ? bullets : ['(No bullet text found on this slide)'],
            notes,
          });
        }

        if (isMounted && parsed.length > 0) {
          setSlides(parsed);
          setCurrentSlideIndex(0);
        }
      } catch (err) {
        console.warn('Failed to parse uploaded PPTX, using fallback template:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    parsePptx(fileBlob);

    return () => {
      isMounted = false;
      stopNarration();
    };
  }, [fileBlob]);

  const activeSlide = slides[currentSlideIndex] || slides[0]!;

  const goToNext = useCallback(() => {
    setCurrentSlideIndex((idx) => Math.min(slides.length - 1, idx + 1));
    stopNarration();
    setIsReadingAloud(false);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlideIndex((idx) => Math.max(0, idx - 1));
    stopNarration();
    setIsReadingAloud(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isFullscreen]);

  // Read slide text aloud
  const handleReadAloud = () => {
    if (isReadingAloud) {
      stopNarration();
      setIsReadingAloud(false);
      return;
    }

    const textToRead = `${activeSlide.title}. ${activeSlide.bullets.join('. ')}. ${activeSlide.notes ? `Speaker notes: ${activeSlide.notes}` : ''}`;
    setIsReadingAloud(true);
    speakNarration(textToRead, {
      rate: 1.0,
      onEnd: () => setIsReadingAloud(false),
    });
  };

  const handleAskAi = () => {
    if (!onAskAi) return;
    const slideSummary = `SLIDE ${activeSlide.slideNumber}: "${activeSlide.title}"\nKEY BULLETS:\n${activeSlide.bullets.map((b) => `- ${b}`).join('\n')}\n${activeSlide.notes ? `SPEAKER NOTES: ${activeSlide.notes}` : ''}`;
    onAskAi(slideSummary);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-[#0B0E14] text-white flex flex-col'
    : isModal
    ? 'fixed inset-4 sm:inset-10 z-50 rounded-2xl bg-[#0E131F] text-white border border-white/10 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl'
    : 'w-full rounded-2xl bg-[#0E131F] text-white border border-white/10 shadow-xl flex flex-col overflow-hidden';

  return (
    <div className={containerClasses}>
      {/* Top Header Bar */}
      <header className="h-14 px-5 border-b border-white/10 bg-[#121826] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0">
            <IconPresentation size={18} />
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-white truncate max-w-sm sm:max-w-md">
              {filename}
            </h2>
            <p className="text-[10px] text-white/50">
              PowerPoint Slide Deck • {slides.length} Slides • {(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB {isLoading ? '• Parsing Slides...' : ''}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Read Aloud Button */}
          <button
            onClick={handleReadAloud}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isReadingAloud 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
            title="Read Current Slide Aloud"
          >
            <IconVolume size={14} className={isReadingAloud ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">{isReadingAloud ? 'Speaking...' : 'Listen'}</span>
          </button>

          {/* Ask AI Button */}
          {onAskAi && (
            <button
              onClick={handleAskAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--cn-primary)] text-[var(--cn-primary-text)] hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
              title="Explain This Slide with AI Study Buddy"
            >
              <IconBrain size={14} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}

          {/* Toggle Grid Overview */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg text-xs border border-white/10 transition-colors ${
              showGrid ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Grid Overview"
          >
            <IconLayoutGrid size={15} />
          </button>

          {/* Toggle Notes */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-2 rounded-lg text-xs border border-white/10 transition-colors ${
              showNotes ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Presenter Notes"
          >
            <IconNotes size={15} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Slideshow'}
          >
            {isFullscreen ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
          </button>

          {/* Close Modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-red-500/20 transition-colors"
              title="Close Presentation"
            >
              <IconX size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Presentation Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Slide Thumbnails Rail (Collapsible in grid mode) */}
        {!showGrid && (
          <aside className="w-48 sm:w-56 border-r border-white/10 bg-[#0C101A] overflow-y-auto p-3 space-y-2.5 shrink-0 hidden md:block">
            <div className="text-[10px] uppercase font-bold tracking-wider text-white/40 px-1 mb-2">
              Slides ({slides.length})
            </div>
            {slides.map((slide, idx) => {
              const isSelected = idx === currentSlideIndex;
              return (
                <button
                  key={slide.slideNumber}
                  onClick={() => {
                    setCurrentSlideIndex(idx);
                    stopNarration();
                    setIsReadingAloud(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'border-orange-500/80 bg-orange-500/10 shadow-md ring-1 ring-orange-500/30'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                    <span className="font-mono font-bold">#{slide.slideNumber}</span>
                    {slide.notes && <IconNotes size={11} className="text-amber-400/80" />}
                  </div>
                  <h4 className="text-xs font-semibold text-white/90 line-clamp-2 leading-tight">
                    {slide.title}
                  </h4>
                </button>
              );
            })}
          </aside>
        )}

        {/* Center Presentation Viewport */}
        {showGrid ? (
          /* Grid View Mode */
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#0A0D14]">
            {slides.map((slide, idx) => (
              <div
                key={slide.slideNumber}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setShowGrid(false);
                }}
                className="aspect-video p-4 rounded-xl border border-white/10 bg-[#131927] hover:border-orange-500/80 hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between shadow-lg group"
              >
                <div>
                  <div className="text-[10px] font-mono text-white/40 mb-1">Slide {slide.slideNumber}</div>
                  <h3 className="text-xs font-bold text-white group-hover:text-orange-400 line-clamp-2">
                    {slide.title}
                  </h3>
                  <p className="text-[11px] text-white/60 mt-2 line-clamp-3">
                    {slide.bullets[0]}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 pt-2 border-t border-white/5">
                  <span>{slide.bullets.length} items</span>
                  {slide.notes && <span className="text-amber-400/80 font-mono">Notes attached</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single Slide Presentation Canvas */
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 items-center justify-center bg-[#070A10]">
            {/* 16:9 Slide Canvas */}
            <div className="w-full max-w-4xl aspect-video rounded-2xl border border-white/15 bg-gradient-to-br from-[#141B2D] via-[#101624] to-[#0A0E17] shadow-2xl p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden select-text">
              {/* Subtle slide watermark background */}
              <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

              {/* Slide Header */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-white/40 uppercase font-mono tracking-wider mb-3">
                  <span>{filename}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold text-orange-400">
                    Slide {activeSlide.slideNumber} / {slides.length}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white border-b border-white/10 pb-4">
                  {activeSlide.title}
                </h1>
              </div>

              {/* Slide Body Bullets */}
              <div className="my-auto py-4 space-y-3">
                {activeSlide.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0 shadow-sm" />
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
                      {bullet}
                    </p>
                  </div>
                ))}

                {/* Optional Embedded Code Snippet */}
                {activeSlide.codeSnippet && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs text-emerald-400 relative group">
                    <button
                      onClick={() => handleCopyCode(activeSlide.codeSnippet!)}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-white/10 text-white/80 hover:text-white text-[10px] flex items-center gap-1"
                    >
                      {copiedCode ? <IconCheck size={12} className="text-emerald-400" /> : null}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{activeSlide.codeSnippet}</pre>
                  </div>
                )}
              </div>

              {/* Slide Footer */}
              <div className="flex items-center justify-between text-[11px] text-white/40 pt-3 border-t border-white/5">
                <span>CourseNest Slide Deck Reader</span>
                <span className="font-mono">Page {activeSlide.slideNumber}</span>
              </div>
            </div>

            {/* Expandable Presenter Notes Drawer */}
            {showNotes && activeSlide.notes && (
              <div className="w-full max-w-4xl mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-200/90 text-xs">
                <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[10px] text-amber-400 mb-1">
                  <IconNotes size={13} />
                  <span>Speaker Notes</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{activeSlide.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sticky Presentation Control Bar */}
      <footer className="h-16 px-6 border-t border-white/10 bg-[#121826] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrev}
            disabled={currentSlideIndex === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <IconChevronLeft size={16} />
            <span className="hidden sm:inline">Previous Slide</span>
          </button>

          <span className="text-xs font-mono text-white/60">
            {currentSlideIndex + 1} / {slides.length}
          </span>

          <button
            onClick={goToNext}
            disabled={currentSlideIndex === slides.length - 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-sm"
          >
            <span className="hidden sm:inline">Next Slide</span>
            <IconChevronRight size={16} />
          </button>
        </div>

        <div className="text-[11px] text-white/40 hidden md:block">
          Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/80">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/80">Arrows</kbd> to advance
        </div>
      </footer>
    </div>
  );
}
