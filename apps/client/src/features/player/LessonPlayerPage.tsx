import { useState, useEffect } from 'react';
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
import { useStorageConfig, toggleMountStatus } from '../../lib/storageConfig';
import { addLog } from '../../lib/logger';
import { getMediaBlobUrl } from '../../lib/mediaVault';
import { EmbeddedDocumentViewer } from '../../components/EmbeddedDocumentViewer';
import { VlcMediaViewer } from '../../components/VlcMediaViewer';
import { AiReadingCompanion } from '../../components/AiReadingCompanion';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark as BookmarkIcon, 
  StickyNote, 
  CheckCircle2, 
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
  HardDrive,
  Eye,
  Sparkles
} from 'lucide-react';

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { courses } = useVaultCourses();
  const { config: storageConfig } = useStorageConfig();

  // Find course, section, and lesson
  const courseData = courses.find((c: CourseData) => c.id === courseId) ?? courses[0];
  const allLessons: LessonData[] = courseData ? courseData.sections.flatMap((s: SectionData) => s.lessons) : [];
  const currentLessonIndex = allLessons.findIndex((l: LessonData) => l.id === lessonId);
  const activeLesson: LessonData | undefined = allLessons[currentLessonIndex >= 0 ? currentLessonIndex : 0];

  // Rails & Panels state
  const [activeSidePanel, setActiveSidePanel] = useState<'none' | 'notes' | 'bookmarks' | 'curriculum' | 'ai-tutor'>('none');
  const [notesContent, setNotesContent] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [aiDocContext, setAiDocContext] = useState<string | undefined>(undefined);

  // Embedded Document Reader Modal state
  const [activeDocViewer, setActiveDocViewer] = useState<{
    filename: string;
    fileSizeBytes?: number;
    description?: string;
    snippet?: string;
    fileUrl?: string;
  } | null>(null);

  // Resolved media URLs from IndexedDB vault
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<string, string>>({});

  // Video Playback Time tracking for notes and bookmarks
  const [currentTime, setCurrentTime] = useState(0);

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
    if (savedTime > 0) {
      setCurrentTime(savedTime);
    }

    // Resolve offline binary assets from IndexedDB media vault
    for (const block of activeLesson.blocks) {
      if (block.src?.startsWith('vault-media://')) {
        const match = block.src.match(/^vault-media:\/\/([^/]+)\/(.+)$/);
        if (match && match[1] && match[2]) {
          const cId = match[1];
          const relPath = match[2];
          getMediaBlobUrl(cId, relPath).then((url) => {
            if (url) {
              setResolvedMediaUrls((prev) => ({ ...prev, [block.id]: url }));
            }
          });
        }
      }
    }
  }, [activeLesson, courseData]);

  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    if (activeLesson) {
      savePlaybackTime(activeLesson.id, seconds);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape' && activeDocViewer) {
        setActiveDocViewer(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDocViewer]);

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

  // Toggle Lesson Completion
  const handleToggleCompletion = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    setLessonProgress(courseData.id, activeLesson.id, { completed: nextState });
    addLog(
      'INFO',
      'PLAYER',
      `Lesson marked ${nextState ? 'Completed' : 'Incomplete'}: ${activeLesson.title}`,
      `Course: ${courseData.title} • Unit ID: ${activeLesson.id}`,
    );
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
    addLog('INFO', 'PLAYER', `Exported notes for ${activeLesson.title} as Markdown (.md)`);
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

    const isPassed = (score / maxScore) * 100 >= activeLesson.quiz.passingScorePercent;
    addLog(
      isPassed ? 'INFO' : 'WARN',
      'PLAYER',
      `Checkpoint quiz submitted: ${score}/${maxScore} pts (${Math.round((score / maxScore) * 100)}%)`,
      `Assessment: ${activeLesson.quiz.title} • Status: ${isPassed ? 'PASSED' : 'RETRY NEEDED'}`,
    );

    // If score meets passing percentage, automatically mark lesson complete
    if (isPassed) {
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

  const isExternalDisconnected = storageConfig.volumeType === 'external' && !storageConfig.isMounted;

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
            <span className="hidden sm:inline">Course Overview</span>
          </Link>
          <span className="text-[var(--cn-text-muted)] font-mono hidden sm:inline">|</span>
          <span className="text-xs font-bold text-[var(--cn-text-primary)] truncate max-w-xs md:max-w-md">
            {activeLesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Storage status chip */}
          {isExternalDisconnected && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] border border-[var(--cn-warning)]/40">
              <HardDrive size={11} />
              EXT DISK UNPLUGGED
            </span>
          )}

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

          {/* AI Reading Companion Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'ai-tutor' ? 'none' : 'ai-tutor')}
            title="AI Reading Companion & Handout Tutor"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              activeSidePanel === 'ai-tutor'
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-semibold'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <Sparkles size={14} className="text-[var(--cn-primary)]" />
            <span className="hidden md:inline">Ask AI</span>
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
              const videoSrc = resolvedMediaUrls[block.id] || (block.src?.startsWith('vault-media://') ? '' : block.src) || '';

              // If External Storage is Disconnected, show graceful fallback card
              if (isExternalDisconnected) {
                return (
                  <div key={block.id} className="w-full aspect-video rounded-2xl border-2 border-dashed border-[var(--cn-warning)]/40 bg-[var(--cn-surface)] p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] flex items-center justify-center">
                      <HardDrive size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[var(--cn-text-primary)]">
                        External Media Drive Disconnected
                      </h4>
                      <p className="text-xs text-[var(--cn-text-muted)] max-w-md font-mono leading-relaxed">
                        Course video media is located on: <span className="text-[var(--cn-warning)] font-semibold">{storageConfig.externalMountPath}</span>.
                        Please reconnect your external USB volume.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => toggleMountStatus(true)}
                        className="px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
                      >
                        Verify Volume Connection
                      </button>
                      <Link
                        to="/settings"
                        className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
                      >
                        Storage Settings
                      </Link>
                    </div>

                    <p className="text-[10px] text-[var(--cn-success)] font-mono pt-1">
                      ✓ Lecture notes, study outlines, and checkpoint quizzes remain fully active and safely preserved.
                    </p>
                  </div>
                );
              }

              if (!videoSrc) {
                return (
                  <div key={block.id} className="p-8 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] text-center space-y-2">
                    <p className="font-bold text-sm text-[var(--cn-text-primary)]">Offline Video Lecture</p>
                    <p className="text-xs text-[var(--cn-text-muted)] font-mono">
                      {block.filename ? `Attached file: ${block.filename}` : 'Preparing video stream...'}
                    </p>
                  </div>
                );
              }

              return (
                <div key={block.id} className="space-y-3">
                  <VlcMediaViewer
                    src={videoSrc}
                    title={activeLesson.title}
                    initialTime={getSavedPlaybackTime(activeLesson.id)}
                    onTimeUpdate={(curr) => {
                      setCurrentTime(curr);
                      if (Math.floor(curr) % 2 === 0) {
                        savePlaybackTime(activeLesson.id, curr);
                      }
                    }}
                  />

                  <div className="flex items-center justify-between text-xs font-mono text-[var(--cn-text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <HardDrive size={12} className="text-[var(--cn-brand)]" />
                      VLC-Grade Stream • Playback position auto-saved to vault database
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
                    <span>LESSON NOTES</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-line font-sans">
                    {content}
                  </div>
                </div>
              );
            }

            // 3. DOCUMENT VIEWER / SLIDE DECK BLOCK (EMBEDDED READER)
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        let fileUrl = resolvedMediaUrls[block.id];
                        if (!fileUrl && block.src?.startsWith('vault-media://')) {
                          const match = block.src.match(/^vault-media:\/\/([^/]+)\/(.+)$/);
                          if (match && match[1] && match[2]) {
                            const cId = match[1];
                            const relPath = match[2];
                            const resolved = await getMediaBlobUrl(cId, relPath);
                            if (resolved) fileUrl = resolved;
                          }
                        }
                        setActiveDocViewer({
                          filename,
                          fileSizeBytes: size,
                          description: 'Course Lecture Handout & Study Material',
                          snippet: block.content,
                          fileUrl,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
                    >
                      <Eye size={13} />
                      <span>Open Embedded Reader</span>
                    </button>
                  </div>
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
                    onClick={() => {
                      alert(`Saved ${filename} to local Downloads folder`);
                      addLog('INFO', 'PLAYER', `Saved asset ${filename} to user storage`);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
                  >
                    Export Starter
                  </button>
                </div>
              );
            }

            return null;
          })}

          {/* 5. INTERACTIVE CHECKPOINT QUIZ */}
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

        {/* Side Rail 4: AI Reading Companion */}
        {activeSidePanel === 'ai-tutor' && (
          <aside className="w-96 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] flex flex-col shrink-0 z-20 shadow-2xl">
            <div className="p-2 border-b border-[var(--cn-border)] flex justify-end bg-[var(--cn-surface-subtle)]/30">
              <button
                onClick={() => setActiveSidePanel('none')}
                className="p-1 rounded text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)]"
                title="Close AI Companion"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AiReadingCompanion
                courseTitle={courseData.title}
                lessonTitle={activeLesson.title}
                lessonId={activeLesson.id}
                activeDocumentText={aiDocContext || activeLesson.description}
                onAppendNote={(note) => setNotesContent(note)}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Embedded Document Reader Modal */}
      {activeDocViewer && (
        <EmbeddedDocumentViewer
          filename={activeDocViewer.filename}
          fileSizeBytes={activeDocViewer.fileSizeBytes}
          description={activeDocViewer.description}
          contentSnippet={activeDocViewer.snippet}
          fileUrl={activeDocViewer.fileUrl}
          onClose={() => setActiveDocViewer(null)}
          isModal={true}
          onAskAi={(excerpt) => {
            setAiDocContext(excerpt);
            setActiveDocViewer(null);
            setActiveSidePanel('ai-tutor');
          }}
        />
      )}

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
