import { useState, useEffect, useMemo, useRef } from 'react';
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
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { sanitizeLectureHtml, formatSubtitleTranscriptForAi } from '../../lib/formatHelpers';
import { 
  IconArrowLeft, 
  IconChevronLeft, 
  IconChevronRight, 
  IconBookmark, 
  IconNote, 
  IconCircleCheck, 
  IconDownload, 
  IconFileText, 
  IconHelp, 
  IconMenu2, 
  IconX,
  IconCheck, 
  IconRotate, 
  IconClock, 
  IconTrash, 
  IconDeviceFloppy, 
  IconEye, 
  IconExternalLink,
  IconBrain,
  IconFileCode,
  IconLink
} from '@tabler/icons-react';

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { courses } = useVaultCourses();
  const { config: storageConfig } = useStorageConfig();

  // Find course, section, and lesson
  const courseData = courses.find((c: CourseData) => c.id === courseId) ?? courses[0];
  const allLessons: LessonData[] = courseData ? courseData.sections.flatMap((s: SectionData) => s.lessons) : [];
  const currentLessonIndex = allLessons.findIndex((l: LessonData) => l.id === lessonId);
  const activeLesson: LessonData | undefined = allLessons[currentLessonIndex >= 0 ? currentLessonIndex : 0];

  // Find parent section and companion materials
  const currentSection = courseData?.sections.find((s: SectionData) => 
    s.lessons.some((l) => l.id === activeLesson?.id)
  );
  const companionSectionLessons = (currentSection?.lessons || []).filter((l) => l.id !== activeLesson?.id);

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
  const currentTimeRef = useRef(0);
  const lastSavedTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

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

    // Resolve offline binary assets and subtitles from IndexedDB media vault
    for (const block of activeLesson.blocks) {
      if (block.src?.startsWith('vault-media://')) {
        const match = block.src.match(/^vault-media:\/\/([^/]+)\/(.+)$/);
        if (match && match[1] && match[2]) {
          const vCourseId = match[1];
          const relPath = match[2];
          getMediaBlobUrl(vCourseId, relPath).then((url) => {
            if (url) {
              setResolvedMediaUrls((prev) => ({ ...prev, [block.id]: url }));
            }
          });
        }
      }

      // Resolve subtitle files
      if (block.subtitles && block.subtitles.length > 0) {
        for (const sub of block.subtitles) {
          if (sub.src?.startsWith('vault-media://')) {
            const subMatch = sub.src.match(/^vault-media:\/\/([^/]+)\/(.+)$/);
            if (subMatch && subMatch[1] && subMatch[2]) {
              const vCourseId = subMatch[1];
              const subRelPath = subMatch[2];
              getMediaBlobUrl(vCourseId, subRelPath).then((url) => {
                if (url) {
                  setResolvedMediaUrls((prev) => ({ ...prev, [sub.id]: url }));
                }
              });
            }
          }
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

  // Active lesson subtitle transcript for AI companion grounding & interactive jumps
  const activeLessonSubtitleTranscript = useMemo(() => {
    if (!activeLesson) return undefined;
    for (const block of activeLesson.blocks) {
      if (block.subtitles && block.subtitles.length > 0) {
        const primarySub = block.subtitles.find((s) => s.isDefault) || block.subtitles[0];
        if (primarySub?.vttContent) {
          return formatSubtitleTranscriptForAi(primarySub.vttContent);
        }
      }
    }
    return undefined;
  }, [activeLesson]);

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
    const activeSec = currentTimeRef.current || currentTime;
    const ts = `[${formatTime(activeSec)}] `;
    const newNotes = notesContent ? `${notesContent}\n${ts}` : ts;
    handleNotesChange(newNotes);
  };

  // Export note as Markdown file
  const handleExportNote = () => {
    const blob = new Blob([notesContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLesson.title.replace(/\s+/g, '_')}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('INFO', 'PLAYER', `Exported study notes: ${activeLesson.title}`);
  };

  // Add bookmark
  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkTitle.trim()) return;

    const activeSec = currentTimeRef.current || currentTime;
    addBookmark(activeLesson.id, Math.floor(activeSec), newBookmarkTitle.trim());

    setNewBookmarkTitle('');
  };

  // Quiz submission
  const handleQuizSubmit = () => {
    if (!activeLesson.quiz) return;
    const questions = activeLesson.quiz.questions;
    let correctCount = 0;

    for (const q of questions) {
      const correctOption = q.options?.find((o) => o.isCorrect);
      if (quizAnswers[q.id] === correctOption?.id) {
        correctCount++;
      }
    }

    const calculatedScore = Math.round((correctCount / questions.length) * 100);
    const passed = calculatedScore >= activeLesson.quiz.passingScorePercent;

    setQuizSubmitted(true);
    setQuizScore(calculatedScore);

    saveQuizResult(activeLesson.id, correctCount, questions.length);

    if (passed) {
      setLessonProgress(courseData.id, activeLesson.id, { completed: true });
      setIsCompleted(true);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isExternalDisconnected = storageConfig.volumeType === 'external' && !storageConfig.isMounted;

  // Sort blocks: Video first, Rich text/HTML second, Documents third, Assets/links fourth
  const typeRank: Record<string, number> = {
    video: 1,
    audio: 2,
    rich_text: 3,
    document: 4,
    downloadable_asset: 5,
    code: 6,
  };
  const sortedBlocks = [...activeLesson.blocks].sort((a, b) => (typeRank[a.type] || 99) - (typeRank[b.type] || 99));

  return (
    <div className="flex flex-col h-full bg-[var(--cn-bg)]">
      {/* Top Player Action Bar */}
      <header className="h-16 px-4 md:px-6 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/course/${courseData.id}`}
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors shrink-0"
          >
            <IconArrowLeft size={14} />
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
              <IconDeviceFloppy size={12} />
              DRIVE UNPLUGGED
            </span>
          )}

          {/* Completion checkmark */}
          <button
            onClick={handleToggleCompletion}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 ${
              isCompleted
                ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <IconCircleCheck size={14} />
            <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
          </button>

          {/* Bookmarks Tab Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'bookmarks' ? 'none' : 'bookmarks')}
            title="Lesson Bookmarks"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 ${
              activeSidePanel === 'bookmarks'
                ? 'bg-[var(--cn-accent)]/15 text-[var(--cn-accent)] border-[var(--cn-accent)]/40 font-semibold'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <IconBookmark size={14} />
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 ${
              activeSidePanel === 'notes'
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-semibold'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <IconNote size={14} />
            <span className="hidden md:inline">Notes</span>
          </button>

          {/* AI Reading Companion Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'ai-tutor' ? 'none' : 'ai-tutor')}
            title="AI Reading Companion & Handout Tutor"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 ${
              activeSidePanel === 'ai-tutor'
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40 font-semibold'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <IconBrain size={14} className="text-[var(--cn-primary)]" />
            <span className="hidden md:inline">Study Companion</span>
          </button>

          {/* Curriculum Drawer Toggle */}
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'curriculum' ? 'none' : 'curriculum')}
            title="Curriculum Outline"
            className={`p-2 rounded-lg border text-xs transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 ${
              activeSidePanel === 'curriculum'
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <IconMenu2 size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace (Player Content + Side Rails) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Central Lesson Content Column */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
          <ErrorBoundary fallbackTitle="Unable to display this lesson block">
            {/* Ordered Content Blocks Loop */}
          {sortedBlocks.map((block: ContentBlockData) => {
            // 1. VIDEO BLOCK
            if (block.type === 'video') {
              const fallbackSampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
              const videoSrc = resolvedMediaUrls[block.id] || (block.src?.startsWith('vault-media://') ? '' : block.src) || fallbackSampleUrl;

              if (isExternalDisconnected) {
                return (
                  <div key={block.id} className="w-full aspect-video rounded-2xl border-2 border-dashed border-[var(--cn-warning)]/40 bg-[var(--cn-surface)] p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] flex items-center justify-center">
                      <IconDeviceFloppy size={24} />
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

              const blockSubs = (block.subtitles || []).map((sub) => ({
                id: sub.id,
                label: sub.label,
                language: sub.language,
                src: resolvedMediaUrls[sub.id] || sub.src,
                isDefault: sub.isDefault,
              }));

              return (
                <div key={block.id} className="space-y-3">
                  <VlcMediaViewer
                    src={videoSrc}
                    title={activeLesson.title}
                    subtitles={blockSubs}
                    initialTime={getSavedPlaybackTime(activeLesson.id)}
                    onTimeUpdate={(curr) => {
                      currentTimeRef.current = curr;
                      const now = Date.now();
                      if (now - lastUiUpdateRef.current >= 1000) {
                        lastUiUpdateRef.current = now;
                        setCurrentTime(curr);
                      }
                      if (Math.abs(curr - lastSavedTimeRef.current) >= 5) {
                        lastSavedTimeRef.current = curr;
                        savePlaybackTime(activeLesson.id, curr);
                      }
                    }}
                  />

                  <div className="flex items-center justify-between text-xs font-mono text-[var(--cn-text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <IconDeviceFloppy size={13} className="text-[var(--cn-brand)]" />
                      Offline Video Stream • Playback position auto-saved
                    </span>
                    <span className="hidden sm:inline">Shortcuts: Space (play/pause), ←/→ (seek 5s), M (mute), F (fullscreen)</span>
                  </div>
                </div>
              );
            }

            // 2. RICH TEXT / LECTURE NOTES / HTML BLOCK (DIRECTLY UNDER VIDEO)
            if (block.type === 'rich_text') {
              const rawContent = block.content || '';
              const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);

              return (
                <div key={block.id} className="p-6 md:p-8 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--cn-primary)] font-bold">
                      <IconFileText size={16} />
                      <span>{block.title || 'LECTURE NOTES & READING MATERIAL'}</span>
                    </div>
                    {block.filename && (
                      <span className="text-[11px] font-mono text-[var(--cn-text-muted)]">
                        {block.filename}
                      </span>
                    )}
                  </div>
                  
                  {isHtml ? (
                    <div 
                      className="prose prose-invert max-w-none text-[var(--cn-text-primary)] leading-relaxed font-sans text-sm overflow-x-auto space-y-2 [&_a]:text-[var(--cn-primary)] [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: sanitizeLectureHtml(rawContent) }}
                    />
                  ) : (
                    <div className="prose max-w-none text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-line font-sans text-sm">
                      {rawContent}
                    </div>
                  )}
                </div>
              );
            }

            // 3. DOCUMENT VIEWER / SLIDE DECK BLOCK (DIRECTLY UNDER VIDEO)
            if (block.type === 'document') {
              const filename = block.filename || 'Document.pdf';
              const size = block.fileSizeBytes || 1024000;
              return (
                <div key={block.id} className="p-5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--cn-info-tint)] text-[var(--cn-info)] flex items-center justify-center shrink-0">
                      <IconFileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--cn-text-primary)]">{filename}</h4>
                      <p className="text-xs text-[var(--cn-text-muted)] mt-0.5 font-mono">
                        Course Handout & Slide Deck • {(size / 1024 / 1024).toFixed(1)} MB
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
                            const vCourseId = match[1];
                            const relPath = match[2];
                            const resolved = await getMediaBlobUrl(vCourseId, relPath);
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
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-xs"
                    >
                      <IconEye size={14} />
                      <span>Read Document</span>
                    </button>
                  </div>
                </div>
              );
            }

            // 4. DOWNLOADABLE ASSET OR WEB LINK (DIRECTLY UNDER VIDEO)
            if (block.type === 'downloadable_asset') {
              const filename = block.filename || 'Reference Link';
              const size = block.fileSizeBytes || 0;
              const isUrl = Boolean(block.src && (block.src.startsWith('http://') || block.src.startsWith('https://')));

              return (
                <div key={block.id} className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center shrink-0">
                      {isUrl ? <IconLink size={18} /> : <IconDownload size={18} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--cn-text-primary)]">{block.title || filename}</p>
                      <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">
                        {isUrl ? (
                          <span className="truncate max-w-sm block text-[var(--cn-primary)]">{block.src}</span>
                        ) : (
                          `${(size / 1024).toFixed(0)} KB • Course File Attachment`
                        )}
                      </p>
                    </div>
                  </div>

                  {isUrl ? (
                    <a
                      href={block.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
                    >
                      <span>Open Link</span>
                      <IconExternalLink size={13} />
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        alert(`Exported ${filename}`);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
                    >
                      Export File
                    </button>
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* 5. COMPANION MATERIALS IN THIS SAME SECTION */}
          {companionSectionLessons.length > 0 && (
            <div className="p-5 md:p-6 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-3">
                <div className="flex items-center gap-2">
                  <IconFileText size={16} className="text-[var(--cn-primary)]" />
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-[var(--cn-text-primary)]">
                    Other Materials in this Chapter ({companionSectionLessons.length})
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-[var(--cn-text-muted)]">
                  {currentSection?.title}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companionSectionLessons.map((item: LessonData) => {
                  const hasVideo = item.blocks.some((b) => b.type === 'video');
                  const hasDoc = item.blocks.some((b) => b.type === 'document');
                  const hasLink = item.blocks.some((b) => b.type === 'downloadable_asset');
                  const isDone = getLessonProgress(courseData.id, item.id)?.completed;

                  return (
                    <Link
                      key={item.id}
                      to={`/course/${courseData.id}/lesson/${item.id}`}
                      className="p-3.5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] hover:border-[var(--cn-primary)] hover:bg-[var(--cn-surface-hover)] transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.99] flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-[var(--cn-surface)] text-[var(--cn-text-secondary)] group-hover:text-[var(--cn-primary)] shrink-0">
                          {hasVideo ? (
                            <IconEye size={15} />
                          ) : hasDoc ? (
                            <IconFileText size={15} />
                          ) : hasLink ? (
                            <IconLink size={15} />
                          ) : (
                            <IconFileCode size={15} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--cn-text-primary)] truncate group-hover:text-[var(--cn-primary)]">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">
                            {hasVideo ? 'Video Lecture' : hasDoc ? 'PDF Handout' : hasLink ? 'Reference Link' : 'Reading Note'}
                          </p>
                        </div>
                      </div>

                      {isDone ? (
                        <IconCircleCheck size={14} className="text-[var(--cn-success)] shrink-0" />
                      ) : (
                        <IconChevronRight size={14} className="text-[var(--cn-text-muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. INTERACTIVE CHECKPOINT QUIZ */}
          {activeLesson.quiz && (
            <div className="p-6 md:p-8 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-4">
                <div className="flex items-center gap-2">
                  <IconHelp size={18} className="text-[var(--cn-accent)]" />
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
                          <strong>{isCorrect ? '✓ Correct:' : '✗ Incorrect:'}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--cn-border)]">
                {quizSubmitted ? (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)]">
                      Your Score: {quizScore}% {quizScore! >= activeLesson.quiz.passingScorePercent ? '(Passed)' : '(Review Material)'}
                    </span>
                    <button
                      onClick={handleRetakeQuiz}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] text-xs font-mono text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
                    >
                      <IconRotate size={13} />
                      <span>Retake Quiz</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length < activeLesson.quiz.questions.length}
                    className="px-5 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-colors shadow-xs"
                  >
                    Submit Answers
                  </button>
                )}
              </div>
            </div>
          )}
          </ErrorBoundary>
        </div>

        {/* Side Rail 1: Personal Notes */}
        {activeSidePanel === 'notes' && (
          <aside className="w-88 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)]">Lesson Notes</span>
              <button onClick={() => setActiveSidePanel('none')} className="p-1.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)]">
                <IconX size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleInsertTimestamp}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--cn-border)] text-[11px] font-mono hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]"
              >
                <IconClock size={12} />
                <span>Stamp {formatTime(currentTime)}</span>
              </button>
              <button
                onClick={handleExportNote}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--cn-border)] text-[11px] font-mono hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)]"
              >
                <IconDownload size={12} />
                <span>Export .md</span>
              </button>
            </div>

            <textarea
              value={notesContent}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Jot down notes, key insights, formulas, or code snippets..."
              className="flex-1 w-full p-3 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-bg)] text-xs font-mono text-[var(--cn-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)] resize-none leading-relaxed"
            />
          </aside>
        )}

        {/* Side Rail 2: Bookmarks */}
        {activeSidePanel === 'bookmarks' && (
          <aside className="w-88 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <span className="text-xs font-mono font-bold text-[var(--cn-text-primary)]">Timestamp Bookmarks</span>
              <button onClick={() => setActiveSidePanel('none')} className="p-1.5 rounded hover:bg-[var(--cn-surface-subtle)] text-[var(--cn-text-muted)]">
                <IconX size={15} />
              </button>
            </div>

            <form onSubmit={handleAddBookmark} className="mb-4 space-y-2">
              <div className="flex gap-1.5">
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] transition-[color,opacity,transform] duration-150 ease-out active:scale-90"
                    >
                      <IconTrash size={13} />
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
                <IconX size={15} />
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
                            <IconCheck size={13} className="text-[var(--cn-success)] shrink-0 ml-1" />
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
                <IconX size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AiReadingCompanion
                courseTitle={courseData.title}
                lessonTitle={activeLesson.title}
                lessonId={activeLesson.id}
                activeDocumentText={aiDocContext || activeLesson.description}
                subtitleTranscript={activeLessonSubtitleTranscript}
                onSeekTo={(sec) => seekTo(sec)}
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
              <IconChevronLeft size={14} />
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-mono font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-xs"
            >
              <span>Next Unit</span>
              <IconChevronRight size={14} />
            </Link>
          ) : (
            <Link
              to={`/course/${courseData.id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cn-success)] text-white text-xs font-mono font-semibold hover:bg-[var(--cn-success)]/90 transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-xs"
            >
              <span>Complete Course</span>
              <IconCircleCheck size={14} />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
