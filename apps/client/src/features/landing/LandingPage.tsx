import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  IconShieldCheck, 
  IconUpload, 
  IconBooks, 
  IconPlayerPlay, 
  IconFileText, 
  IconDeviceFloppy, 
  IconBroadcast, 
  IconArrowRight, 
  IconAdjustmentsHorizontal, 
  IconBrandGithub, 
  IconExternalLink, 
  IconLock, 
  IconRepeat 
} from '@tabler/icons-react';
import { BrandLogo } from '../../components/BrandLogo';
import { VlcMediaViewer } from '../../components/VlcMediaViewer';
import { EmbeddedDocumentViewer } from '../../components/EmbeddedDocumentViewer';
import { useVaultCourses, type CourseData } from '../../lib/courseStore';

export function LandingPage() {
  const { courses } = useVaultCourses();
  const [activeDemoTab, setActiveDemoTab] = useState<'vlc' | 'pdf' | 'vault'>('vlc');
  const [simulatedDriveConnected, setSimulatedDriveConnected] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--cn-bg)] text-[var(--cn-text-primary)] selection:bg-[#57C564]/20 selection:text-[#57C564]">
      {/* ── 1. AMBIENT HERO SECTION ─────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 px-6 md:px-12 border-b border-[var(--cn-border)]">
        {/* Ambient Radial Gradient Mesh */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 20%, rgba(87, 197, 100, 0.25) 0%, transparent 60%)`,
          }}
        />

        <div className="max-w-6xl mx-auto space-y-8 relative z-10 text-center flex flex-col items-center">
          {/* Top Pill Badges */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-[#57C564]/10 text-[#57C564] border border-[#57C564]/30 moss-glow-sm">
            <IconBroadcast size={14} className="text-[#57C564]" />
            <span>OPEN-SOURCE • PRIVATE OFFLINE LEARNING</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl font-display leading-[1.12] text-[var(--cn-text-primary)] text-pretty">
            Autonomous, offline study with{' '}
            <span className="text-[var(--cn-primary)]">
              VLC & PDF.js
            </span>{' '}
            power.
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-[var(--cn-text-secondary)] max-w-3xl leading-relaxed font-sans text-pretty">
            Transform any computer into a private offline study space. Import course archives,
            amplify low-volume lecture audio up to <span className="text-[var(--cn-text-primary)] font-semibold">200% with VLC Web Audio</span>,
            and inspect slide decks with an embedded <span className="text-[var(--cn-text-primary)] font-semibold">Mozilla PDF.js reader</span>.
            Zero cloud tracking. 100% private.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/library"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-sm font-bold hover:brightness-110 transition-[background-color,transform] duration-150 ease-out shadow-lg moss-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <IconBooks size={18} />
              <span>Explore Courses</span>
              <IconArrowRight size={16} />
            </Link>

            <Link
              to="/import"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] text-sm font-semibold text-[var(--cn-text-primary)] hover:border-[var(--cn-primary)]/40 hover:bg-[var(--cn-surface-hover)] transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.98] card-tactile"
            >
              <IconUpload size={18} className="text-[var(--cn-primary)]" />
              <span>Add Course Materials</span>
            </Link>

            <a
              href="https://github.com/PixelApprentice/CourseNest"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] text-sm font-mono text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:border-[var(--cn-border-highlight)] transition-[color,border-color,transform] duration-150 ease-out active:scale-[0.98]"
            >
              <IconBrandGithub size={16} />
              <span>GitHub</span>
            </a>
          </div>

          {/* Key Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl w-full text-left font-mono">
            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] card-tactile">
              <span className="text-[11px] text-[var(--cn-text-muted)] uppercase block font-semibold">Video Core</span>
              <span className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 mt-1">
                <IconBroadcast size={14} className="text-[#EA580C]" />
                VLC 200% Gain
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] card-tactile">
              <span className="text-[11px] text-[var(--cn-text-muted)] uppercase block font-semibold">Doc Reader</span>
              <span className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 mt-1">
                <IconFileText size={14} className="text-[#3B82F6]" />
                Mozilla PDF.js
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] card-tactile">
              <span className="text-[11px] text-[var(--cn-text-muted)] uppercase block font-semibold">Offline Storage</span>
              <span className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 mt-1">
                <IconDeviceFloppy size={14} className="text-[#57C564]" />
                Private SQLite
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] card-tactile">
              <span className="text-[11px] text-[var(--cn-text-muted)] uppercase block font-semibold">Multi-Audience</span>
              <span className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 mt-1">
                <IconShieldCheck size={14} className="text-[#A855F7]" />
                9 Bespoke Themes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. INTERACTIVE OPEN-SOURCE ENGINE PLAYGROUND ────────────────── */}
      <section className="py-16 md:py-24 px-6 md:px-12 border-b border-[var(--cn-border)] bg-[var(--cn-surface)]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#57C564]">
                <span>CORE ENGINE CAPABILITIES</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-[var(--cn-text-primary)]">
                Integrated Media & Document Engines
              </h2>
              <p className="text-sm text-[var(--cn-text-secondary)] max-w-xl">
                Switch between the open-source engines below to experience the VLC audio boost,
                PDF page-spread viewer, and decoupled storage resilience.
              </p>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex items-center bg-[var(--cn-bg)] p-1 rounded-xl border border-[var(--cn-border)] text-xs font-mono overflow-x-auto">
              <button
                onClick={() => setActiveDemoTab('vlc')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-[background-color,color,transform] duration-150 ease-out active:scale-95 ${
                  activeDemoTab === 'vlc'
                    ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-bold shadow-sm'
                    : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                <IconBroadcast size={14} />
                <span>VLC Video Core</span>
              </button>

              <button
                onClick={() => setActiveDemoTab('pdf')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-[background-color,color,transform] duration-150 ease-out active:scale-95 ${
                  activeDemoTab === 'pdf'
                    ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-bold shadow-sm'
                    : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                <IconFileText size={14} />
                <span>Mozilla PDF.js Reader</span>
              </button>

              <button
                onClick={() => setActiveDemoTab('vault')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-[background-color,color,transform] duration-150 ease-out active:scale-95 ${
                  activeDemoTab === 'vault'
                    ? 'bg-[var(--cn-primary)] text-[var(--cn-primary-text)] font-bold shadow-sm'
                    : 'text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)]'
                }`}
              >
                <IconDeviceFloppy size={14} />
                <span>Storage Resilience</span>
              </button>
            </div>
          </div>

          {/* Sandbox Canvas */}
          <div className="p-4 md:p-8 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-bg)] shadow-2xl">
            {/* TAB 1: VLC VIDEO ENGINE */}
            {activeDemoTab === 'vlc' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#57C564] font-bold flex items-center gap-1.5">
                    <IconBroadcast size={14} />
                    Live VLC Media Suite Engine (Sample Stream)
                  </span>
                  <span className="text-slate-400">
                    Features: 200% Audio Gain Booster • Frame Stepper • A-B Looper • Speech Filter
                  </span>
                </div>

                <div className="max-w-4xl mx-auto">
                  <VlcMediaViewer
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                    title="Operating Systems: Memory Management & Paging Architecture"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1.5">
                    <h4 className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                      <IconAdjustmentsHorizontal size={14} className="text-[#57C564]" />
                      200% Super-Gain Booster
                    </h4>
                    <p className="text-[11px] text-[var(--cn-text-secondary)] leading-relaxed">
                      Laptops often struggle with quiet recorded lecture audio. Our Web Audio graph boosts volume up to 2.0x safely.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1.5">
                    <h4 className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                      <IconRepeat size={14} className="text-[#F59E0B]" />
                      A-B Interval Looper
                    </h4>
                    <p className="text-[11px] text-[var(--cn-text-secondary)] leading-relaxed">
                      Mark Point A and Point B on the seekbar to loop difficult algorithmic proofs and code explanations seamlessly.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1.5">
                    <h4 className="text-xs font-bold text-[var(--cn-text-primary)] flex items-center gap-1.5 font-mono">
                      <IconExternalLink size={14} className="text-[#3B82F6]" />
                      Native VLC Desktop Bridge
                    </h4>
                    <p className="text-[11px] text-[var(--cn-text-secondary)] leading-relaxed">
                      Prefer standalone desktop playback? Click "Open in VLC" to stream media directly into the official VLC Media Player.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PDF.JS READER ENGINE */}
            {activeDemoTab === 'pdf' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#57C564] font-bold flex items-center gap-1.5">
                    <IconFileText size={14} />
                    Embedded Mozilla PDF.js Document Studio
                  </span>
                  <span className="text-slate-400">
                    Features: Two-Page Spread • In-Document Search • Page Jump • Fullscreen Presentation
                  </span>
                </div>

                <EmbeddedDocumentViewer
                  filename="Lecture_04_Concurrency_and_Deadlocks.pdf"
                  fileSizeBytes={4200000}
                  isModal={false}
                />
              </div>
            )}

            {/* TAB 3: STORAGE RESILIENCE */}
            {activeDemoTab === 'vault' && (
              <div className="space-y-6 max-w-4xl mx-auto py-4">
                <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconDeviceFloppy size={20} className="text-[#57C564]" />
                      <div>
                        <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">
                          External Media Disconnection Resilience
                        </h3>
                        <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                          Simulate unplugging an external USB or SD drive with heavy video files.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSimulatedDriveConnected(!simulatedDriveConnected)}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                        simulatedDriveConnected
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-[#57C564] text-black font-bold'
                      }`}
                    >
                      {simulatedDriveConnected ? 'Simulate Disconnect' : 'Reconnect USB Drive'}
                    </button>
                  </div>

                  {/* Simulator State Card */}
                  <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--cn-text-secondary)]">External Media Mount: /media/usb-courses</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${simulatedDriveConnected ? 'bg-[#57C564]/20 text-[#57C564]' : 'bg-red-500/20 text-red-400'}`}>
                        {simulatedDriveConnected ? '● DRIVE CONNECTED' : '○ DRIVE UNPLUGGED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-2">
                      <div className="p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
                        <span className="text-[10px] text-[var(--cn-text-muted)] uppercase block font-semibold">Video Stream</span>
                        <p className={simulatedDriveConnected ? 'text-[#57C564]' : 'text-[#F59E0B]'}>
                          {simulatedDriveConnected ? '✓ 1080p MP4 Ready' : '⚠ Fallback card shown — no crash'}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-[#57C564]/30 bg-[#57C564]/10 space-y-1">
                        <span className="text-[10px] text-[#57C564] uppercase block font-bold">Internal Learning Records</span>
                        <p className="text-[var(--cn-text-primary)] font-bold">
                          ✓ 100% Preserved (Notes, Bookmarks, Quizzes active in SQLite)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. FOUR ARCHITECTURAL PILLARS ────────────────────────────── */}
      <section className="py-16 md:py-24 px-6 md:px-12 border-b border-[var(--cn-border)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-[var(--cn-text-primary)]">
              Why Private & Offline Learning Matters
            </h2>
            <p className="text-sm text-[var(--cn-text-secondary)]">
              Built for universities, researchers, travelers, and students who value focus and data privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-3 card-tactile">
              <div className="w-10 h-10 rounded-xl bg-[#57C564]/10 text-[#57C564] flex items-center justify-center">
                <IconDeviceFloppy size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">Private Offline Storage</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Internal learning state (progress, notes, bookmarks) is strictly decoupled from heavy media drives, ensuring zero data loss if an external SSD unplugs.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-3 card-tactile">
              <div className="w-10 h-10 rounded-xl bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
                <IconBroadcast size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">VLC Media Suite</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Web Audio API super-gain up to 200%, frame-by-frame stepping for code review, vocal clarity equalizer filters, and direct desktop VLC protocol bridges.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-3 card-tactile">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center">
                <IconFileText size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">Mozilla PDF.js Core</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Full-featured document reading with two-page book spreads, in-document keyword search, thumbnail filmstrips, and distraction-free fullscreen.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-3 card-tactile">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
                <IconLock size={20} />
              </div>
              <h3 className="font-bold text-base text-[var(--cn-text-primary)]">Safe Archive Decompression</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Multi-archive decompression engine rigorously blocks directory traversal attacks, null-byte injections, and executes all untrusted scripts safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. OFFLINE COURSE VAULT CATALOG PREVIEW ──────────────────── */}
      <section className="py-16 md:py-24 px-6 md:px-12 border-b border-[var(--cn-border)] bg-[var(--cn-surface)]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold font-display text-[var(--cn-text-primary)]">
                Stored Course Library
              </h2>
              <p className="text-xs text-[var(--cn-text-secondary)] font-mono">
                Verified local courses ready for immediate offline study.
              </p>
            </div>

            <Link
              to="/library"
              className="text-xs font-mono font-bold text-[var(--cn-primary)] hover:underline flex items-center gap-1"
            >
              <span>View All ({courses.length})</span>
              <IconArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course: CourseData) => {
              const totalLessons = course.sections.flatMap((s) => s.lessons).length;
              return (
                <div 
                  key={course.id}
                  className="p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-4 card-tactile flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30 font-bold">
                        {course.subject || 'Computer Science'}
                      </span>
                      <span className="text-[var(--cn-text-muted)]">
                        v{course.version} • {course.estimatedDurationMinutes}m
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[var(--cn-text-primary)] font-display">
                      {course.title}
                    </h3>

                    <p className="text-xs text-[var(--cn-text-secondary)] line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {course.tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--cn-bg)] text-[var(--cn-text-muted)] border border-[var(--cn-border)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--cn-border)] flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--cn-text-muted)]">
                      {course.sections.length} Sections • {totalLessons} Lessons
                    </span>

                    <Link
                      to={`/course/${course.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-bold hover:brightness-110 transition-colors"
                    >
                      <IconPlayerPlay size={13} />
                      <span>Start Learning</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. THREE-STEP STUDY ONBOARDING ──────────────────────────── */}
      <section className="py-16 md:py-24 px-6 md:px-12 border-b border-[var(--cn-border)]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold font-display text-[var(--cn-text-primary)]">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-xs text-[var(--cn-text-secondary)] font-mono">
              Completely private, local-first learning with zero cloud lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-2.5 card-tactile">
              <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary)]/10 text-[var(--cn-primary)] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">Add Course Files</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Import any standard course archive, YouTube lecture link, PDF textbook, or PPTX presentation deck.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-2.5 card-tactile">
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">Pick Your Study Vibe</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Choose between Obsidian Moss, Halal Serenity, Sakura Bloom, Manga Screentone, Toybox, or Paper themes.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-2.5 card-tactile">
              <div className="w-8 h-8 rounded-lg bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">Study Anywhere Offline</h3>
              <p className="text-xs text-[var(--cn-text-secondary)] leading-relaxed">
                Watch with 200% audio boost, generate active-recall flashcards, and study with in-browser semantic AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER ────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 md:px-12 bg-[var(--cn-surface)] border-t border-[var(--cn-border)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-xs font-mono text-[var(--cn-text-muted)]">
              Open-Source Offline Learning Platform
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[var(--cn-text-secondary)]">
            <Link to="/library" className="hover:text-[var(--cn-text-primary)] transition-colors">My Courses</Link>
            <Link to="/import" className="hover:text-[var(--cn-text-primary)] transition-colors">Add Materials</Link>
            <Link to="/settings" className="hover:text-[var(--cn-text-primary)] transition-colors">Settings</Link>
            <Link to="/settings?tab=logs" className="hover:text-[var(--cn-text-primary)] transition-colors">System Logs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
