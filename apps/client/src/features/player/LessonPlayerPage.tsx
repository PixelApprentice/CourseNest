import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  useVaultCourses, 
  getLessonProgress, 
  setLessonProgress, 
  getSavedPlaybackTime, 
  savePlaybackTime, 
  getUserNotes, 
  saveUserNote,
  getLessonBookmarks,
  addBookmark,
  removeBookmark,
  saveQuizResult,
  getQuizResult,
  type CourseData,
  type SectionData,
  type LessonData,
  type ContentBlockData,
  type QuizQuestion,
  type UserBookmark
} from '../../lib/courseStore';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark as BookmarkIcon, 
  StickyNote, 
  CheckCircle2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Download, 
  FileText, 
  HelpCircle, 
  Menu, 
  X,
  Check,
  RotateCcw,
  Clock,
  Trash2,
  Share2,
  HardDrive
} from 'lucide-react';

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { courses } = useVaultCourses();

  // Find course, section, and lesson
  const courseData = courses.find((c: CourseData) => c.id === courseId) ?? courses[0];
  const allLessons: LessonData[] = courseData ? courseData.sections.flatMap((s: SectionData) => s.lessons) : [];
  const currentLessonIndex = allLessons.findIndex((l: LessonData) => l.id === lessonId);
  const activeLesson: LessonData | undefined = allLessons[currentLessonIndex >= 0 ? currentLessonIndex : 0];

  // Rails & Panels state
  const [activeSidePanel, setActiveSidePanel] = useState<'none' | 'notes' | 'bookmarks' | 'curriculum'>('none');
  const [notesContent, setNotesContent] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Video Player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Load progress, notes, and bookmark on lesson switch
  useEffect(() => {
    if (!activeLesson || !courseData) return;
    const lId = activeLesson.id;
    const cId = courseData.id;

    // Load notes
    setNotesContent(getUserNotes(lId));

    // Load completion state
    const prog = getLessonProgress(cId, lId);
    setIsCompleted(prog?.completed ?? false);

    // Load existing quiz score if submitted previously
    const prevQuiz = getQuizResult(lId);
    if (prevQuiz) {
      setQuizSubmitted(true);
      setQuizScore(prevQuiz.score);
    } else {
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
    }

    // Restore video time
    const savedTime = getSavedPlaybackTime(lId);
    if (videoRef.current && savedTime > 0) {
      videoRef.current.currentTime = savedTime;
    }
  }, [activeLesson, courseData]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (delta: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 100, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        videoRef.current?.requestFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, isMuted]);

  if (!courseData || !activeLesson) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-sm font-mono text-[var(--cn-text-muted)]">Lesson not found in local vault.</p>
        <Link to="/library" className="text-xs font-mono text-[var(--cn-primary)] underline">
          Return to Course Vault
        </Link>
      </div>
    );
  }

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;
  const bookmarks: UserBookmark[] = getLessonBookmarks(activeLesson.id);

  // Video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (Math.floor(curr) % 2 === 0) {
      savePlaybackTime(activeLesson.id, curr);
    }
  };

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    const saved = getSavedPlaybackTime(activeLesson.id);
    if (saved > 0 && saved < videoRef.current.duration) {
      videoRef.current.currentTime = saved;
    }
  };

  // Toggle Lesson Completion
  const handleToggleCompletion = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    setLessonProgress(courseData.id, activeLesson.id, { completed: nextState });
  };

  // Save notes handler
  const handleNotesChange = (text: string) => {
    setNotesContent(text);
    saveUserNote(activeLesson.id, text);
  };

  // Insert current timestamp into notes
  const handleInsertTimestamp = () => {
    const ts = `[${formatTime(currentTime)}] `;
    const newNotes = notesContent ? `${notesContent}\n${ts}` : ts;
    handleNotesChange(newNotes);
  };

  // Export note as Markdown file
  const handleExportNote = () => {
    const content = `# Notes: ${activeLesson.title}\nCourse: ${courseData.title}\nDate: ${new Date().toLocaleDateString()}\n\n${notesContent}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${activeLesson.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add bookmark
  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newBookmarkTitle.trim() || `Bookmark at ${formatTime(currentTime)}`;
    addBookmark(activeLesson.id, currentTime, title);
    setNewBookmarkTitle('');
  };

  // Submit quiz
  const handleQuizSubmit = () => {
    if (!activeLesson.quiz?.questions) return;
    let score = 0;
    const maxScore = activeLesson.quiz.questions.length;

    activeLesson.quiz.questions.forEach((q: QuizQuestion) => {
      const correctOpt = q.options?.find((o) => o.isCorrect);
      if (correctOpt && quizAnswers[q.id] === correctOpt.id) {
        score += 1;
      }
    });

    setQuizScore(score);
    setQuizSubmitted(true);
    saveQuizResult(activeLesson.id, score, maxScore);

    // If score meets passing percentage, automatically mark lesson complete
    if ((score / maxScore) * 100 >= activeLesson.quiz.passingScorePercent) {
      setIsCompleted(true);
      setLessonProgress(courseData.id, activeLesson.id, { completed: true });
    }
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--cn-bg)]">
      {/* Top Player Action Bar */}
      <header className="h-16 px-4 md:px-6 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/course/${courseData.id}`}
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Dossier</span>
          </Link>
          <span className="text-[var(--cn-text-muted)] font-mono hidden sm:inline">|</span>
          <span className="text-xs font-bold text-[var(--cn-text-primary)] truncate max-w-xs md:max-w-md">
            {activeLesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Completion checkmark */}
          <button
            onClick={handleToggleCompletion}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
              isCompleted
                ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
          </button>

          {/* Bookmarks Tab Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'bookmarks' ? 'none' : 'bookmarks')}
            title="Lesson Bookmarks"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              activeSidePanel === 'bookmarks'
                ? 'bg-[var(--cn-accent)]/15 text-[var(--cn-accent)] border-[var(--cn-accent)]/40 font-semibold'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <BookmarkIcon size={14} />
            <span className="hidden md:inline">Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="px-1 rounded bg-[var(--cn-surface-subtle)] text-[10px]">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Notes Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'notes' ? 'none' : 'notes')}
            title="Lesson Notes"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              activeSidePanel === 'notes'
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-semibold'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <StickyNote size={14} />
            <span className="hidden md:inline">Notes</span>
          </button>

          {/* Curriculum Drawer Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'curriculum' ? 'none' : 'curriculum')}
            title="Curriculum Outline"
            className={`p-2 rounded-lg border text-xs transition-colors ${
              activeSidePanel === 'curriculum'
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace (Player Content + Side Rails) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Central Lesson Content Column */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
          {/* Ordered Content Blocks Loop */}
          {activeLesson.blocks.map((block: ContentBlockData) => {
            // 1. VIDEO BLOCK
            if (block.type === 'video') {
              const src = block.src || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
              return (
                <div key={block.id} className="space-y-3">
                  <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-[var(--cn-border)] group">
                    <video
                      ref={videoRef}
                      src={src}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={handleTogglePlay}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />

                    {/* Custom Video Controls Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2.5 opacity-95 group-hover:opacity-100 transition-opacity">
                      {/* Scrub Bar */}
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
                        className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[var(--cn-primary)]"
                      />

                      <div className="flex items-center justify-between text-white text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleTogglePlay}
                            className="p-1 hover:text-[var(--cn-primary)] transition-colors"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                          >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                          </button>

                          <button
                            onClick={() => seekRelative(-5)}
                            className="text-[11px] hover:text-[var(--cn-primary)] px-1"
                            title="Rewind 5s (Left Arrow)"
                          >
                            -5s
                          </button>
                          <button
                            onClick={() => seekRelative(5)}
                            className="text-[11px] hover:text-[var(--cn-primary)] px-1"
                            title="Forward 5s (Right Arrow)"
                          >
                            +5s
                          </button>

                          <button
                            onClick={toggleMute}
                            className="p-1 hover:text-[var(--cn-primary)] transition-colors"
                            aria-label={isMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </button>

                          <span className="text-[11px]">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Speed Selector */}
                          <select
                            value={playbackSpeed}
                            onChange={(e) => {
                              const spd = parseFloat(e.target.value);
                              setPlaybackSpeed(spd);
                              if (videoRef.current) videoRef.current.playbackRate = spd;
                            }}
                            className="bg-black/70 border border-white/20 rounded px-2 py-0.5 text-xs text-white focus:outline-none font-mono"
                          >
                            <option value="0.75">0.75×</option>
                            <option value="1">1.0×</option>
                            <option value="1.25">1.25×</option>
                            <option value="1.5">1.5×</option>
                            <option value="2.0">2.0×</option>
                          </select>

                          {/* Fullscreen button */}
                          <button
                            onClick={() => videoRef.current?.requestFullscreen()}
                            className="p-1 hover:text-[var(--cn-primary)] transition-colors"
                            aria-label="Fullscreen"
                          >
                            <Maximize size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[var(--cn-text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <HardDrive size={12} className="text-[var(--cn-success)]" />
                      Playback position auto-saved to vault database
                    </span>
                    <span className="hidden sm:inline">Shortcuts: Space (play/pause), ←/→ (seek 5s), M (mute), F (fullscreen)</span>
                  </div>
                </div>
              );
            }

            // 2. RICH TEXT / LECTURE NOTES BLOCK
            if (block.type === 'rich_text') {
              const content = block.content || '';
              return (
                <div key={block.id} className="p-6 md:p-8 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--cn-primary)] font-semibold border-b border-[var(--cn-border)] pb-2">
                    <FileText size={14} />
                    <span>SYLLABUS LECTURE NOTES</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-line font-sans">
                    {content}
                  </div>
                </div>
              );
            }

            // 3. DOCUMENT VIEWER / SLIDE DECK BLOCK
            if (block.type === 'document') {
              const filename = block.filename || 'Document.pdf';
              const size = block.fileSizeBytes || 1024000;
              return (
                <div key={block.id} className="p-5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--cn-info-tint)] text-[var(--cn-info)] flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--cn-text-primary)]">{filename}</h4>
                      <p className="text-xs text-[var(--cn-text-muted)] mt-0.5 font-mono">
                        Attached course document • {(size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Opened local cached document: ${filename}`)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors"
                  >
                    <Download size={13} />
                    <span>Open Reader</span>
                  </button>
                </div>
              );
            }

            // 4. DOWNLOADABLE STARTER ARCHIVE
            if (block.type === 'downloadable_asset') {
              const filename = block.filename || 'starter.zip';
              const size = block.fileSizeBytes || 500000;
              return (
                <div key={block.id} className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Download size={18} className="text-[var(--cn-primary)] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--cn-text-primary)]">{filename}</p>
                      <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">
                        {(size / 1024).toFixed(0)} KB • Verified Sandbox
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Saved ${filename} to local Downloads folder`)}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
                  >
                    Export Starter
                  </button>
                </div>
              );
            }

            return null;
          })}

          {/* 5. INTERACTIVE CHECKPOINT QUIZ (IF PRESENT ON LESSON) */}
          {activeLesson.quiz && (
            <div className="p-6 md:p-8 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-[var(--cn-accent)]" />
                  <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">{activeLesson.quiz.title}</h3>
                </div>
                <span className="text-xs font-mono text-[var(--cn-text-muted)]">
                  Passing Threshold: {activeLesson.quiz.passingScorePercent}%
                </span>
              </div>

              <div className="space-y-6">
                {activeLesson.quiz.questions.map((q: QuizQuestion, idx: number) => {
                  const selected = quizAnswers[q.id];
                  const correctOption = q.options?.find((o) => o.isCorrect);
                  const isCorrect = selected === correctOption?.id;

                  return (
                    <div key={q.id} className="space-y-3">
                      <p className="text-xs font-bold text-[var(--cn-text-primary)] font-mono">
                        {idx + 1}. {q.prompt}
                      </p>
                      <div className="space-y-2">
                        {q.options?.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              selected === opt.id
                                ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/40 font-medium'
                                : 'border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.id}
                              checked={selected === opt.id}
                              disabled={quizSubmitted}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt.id })}
                              className="accent-[var(--cn-primary)]"
                            />
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>

                      {quizSubmitted && (
                        <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                          isCorrect 
                            ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/30' 
                            : 'bg-[var(--cn-danger-tint)] text-[var(--cn-danger)] border border-[var(--cn-danger)]/30'
                        }`}>
                          <strong>{isCorrect ? '✓ Correct Assessment:' : '✗ Incorrect:'}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[var(--cn-border)]">
                {quizSubmitted ? (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)]">
                      Score: {quizScore} / {activeLesson.quiz.questions.length} pts ({Math.round(((quizScore ?? 0) / activeLesson.quiz.questions.length) * 100)}%)
                    </span>
                    <button
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                        setQuizScore(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-mono text-[var(--cn-primary)] font-medium hover:underline"
                    >
                      <RotateCcw size={12} />
                      <span>Retry Assessment</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length === 0}
                    className="px-5 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-colors shadow-xs"
                  >
                    Submit Checkpoint Evaluation
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Rail 1: Personal Notes */}
        {activeSidePanel === 'notes' && (
          <aside className="w-88 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cn-text-primary)]">
                <StickyNote size={14} className="text-[var(--cn-primary)]" />
                <span>Personal Study Notes</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleExportNote}
                  title="Export note as Markdown (.md)" 
                  className="p-1.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]"
                >
                  <Share2 size={13} />
                </button>
                <button onClick={() => setActiveSidePanel('none')} className="p-1.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)]">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleInsertTimestamp}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--cn-surface-subtle)] hover:bg-[var(--cn-surface)] text-[10px] font-mono text-[var(--cn-primary)] border border-[var(--cn-border)]"
                title="Insert current video timestamp"
              >
                <Clock size={11} />
                <span>Stamp {formatTime(currentTime)}</span>
              </button>
              <span className="text-[10px] font-mono text-[var(--cn-text-muted)]">Auto-saved to local vault</span>
            </div>

            <textarea
              value={notesContent}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Record Markdown insights, equations, and key takeaways..."
              className="flex-1 w-full p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs text-[var(--cn-text-primary)] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)] leading-relaxed"
            />
          </aside>
        )}

        {/* Side Rail 2: Bookmarks */}
        {activeSidePanel === 'bookmarks' && (
          <aside className="w-88 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cn-text-primary)]">
                <BookmarkIcon size={14} className="text-[var(--cn-accent)]" />
                <span>Video Markers ({bookmarks.length})</span>
              </div>
              <button onClick={() => setActiveSidePanel('none')} className="p-1.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)]">
                <X size={15} />
              </button>
            </div>

            {/* Add Bookmark Form */}
            <form onSubmit={handleCreateBookmark} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Marker at ${formatTime(currentTime)}...`}
                  value={newBookmarkTitle}
                  onChange={(e) => setNewBookmarkTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors"
                >
                  Pin
                </button>
              </div>
            </form>

            {/* Bookmark List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {bookmarks.length === 0 ? (
                <p className="text-xs font-mono text-[var(--cn-text-muted)] text-center py-6">
                  No bookmarks pinned yet. Pin key lecture moments to jump back quickly.
                </p>
              ) : (
                bookmarks.map((bm: UserBookmark) => (
                  <div
                    key={bm.id}
                    className="p-2.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-bg)] flex items-center justify-between gap-2 text-xs group"
                  >
                    <button
                      onClick={() => seekTo(bm.timestampSeconds)}
                      className="flex-1 text-left flex items-center gap-2 hover:text-[var(--cn-primary)] transition-colors truncate"
                    >
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--cn-surface)] border border-[var(--cn-border)] text-[var(--cn-primary)] font-bold">
                        {formatTime(bm.timestampSeconds)}
                      </span>
                      <span className="truncate text-[var(--cn-text-primary)]">{bm.title}</span>
                    </button>

                    <button
                      onClick={() => removeBookmark(activeLesson.id, bm.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Side Rail 3: Curriculum Outline */}
        {activeSidePanel === 'curriculum' && (
          <aside className="w-88 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)]">Curriculum Navigation</span>
              <button onClick={() => setActiveSidePanel('none')} className="p-1.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)]">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              {courseData.sections.map((section: SectionData) => (
                <div key={section.id} className="space-y-1">
                  <h5 className="text-[10px] font-mono font-bold text-[var(--cn-text-muted)] uppercase tracking-wider">
                    {section.title}
                  </h5>
                  <div className="space-y-1">
                    {section.lessons.map((item: LessonData) => {
                      const isCurrent = item.id === activeLesson.id;
                      const isDone = getLessonProgress(courseData.id, item.id)?.completed;

                      return (
                        <Link
                          key={item.id}
                          to={`/course/${courseData.id}/lesson/${item.id}`}
                          onClick={() => setActiveSidePanel('none')}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isCurrent
                              ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-semibold shadow-xs'
                              : 'text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {isDone && (
                            <Check size={13} className="text-[var(--cn-success)] shrink-0 ml-1" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Sticky Lesson Navigation */}
      <footer className="h-16 px-6 border-t border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0">
        <div>
          {prevLesson ? (
            <Link
              to={`/course/${courseData.id}/lesson/${prevLesson.id}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </Link>
          ) : (
            <span className="text-xs font-mono text-[var(--cn-text-muted)]">First Unit</span>
          )}
        </div>

        <span className="text-xs font-mono text-[var(--cn-text-muted)] hidden sm:inline">
          Lesson {currentLessonIndex + 1} of {allLessons.length}
        </span>

        <div>
          {nextLesson ? (
            <Link
              to={`/course/${courseData.id}/lesson/${nextLesson.id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
            >
              <span>Next Unit</span>
              <ChevronRight size={14} />
            </Link>
          ) : (
            <Link
              to={`/course/${courseData.id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cn-success)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-success)]/90 transition-colors shadow-xs"
            >
              <span>Complete Course</span>
              <CheckCircle2 size={14} />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
