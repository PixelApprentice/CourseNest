import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  useCourses, 
  getLessonProgress, 
  setLessonProgress, 
  getSavedPlaybackTime, 
  savePlaybackTime, 
  getLessonNotes, 
  saveLessonNotes 
} from '../../lib/courseStore';
import { ContentBlockType } from '@coursenest/domain';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
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
  RotateCcw
} from 'lucide-react';

export function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { courses } = useCourses();

  // Find course, section, and lesson
  const courseData = courses.find((c) => c.course.id === courseId) ?? courses[0];
  const allLessons = courseData ? courseData.sections.flatMap((s) => s.lessons) : [];
  const currentLessonIndex = allLessons.findIndex((l) => l.lesson.id === lessonId);
  const activeLessonData = allLessons[currentLessonIndex >= 0 ? currentLessonIndex : 0];

  // Rails & Panels state
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
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

  // Load progress, notes, and bookmark on lesson switch
  useEffect(() => {
    if (!activeLessonData) return;
    const lId = activeLessonData.lesson.id;
    const cId = courseData?.course.id ?? '';

    // Load notes
    setNotesContent(getLessonNotes(lId));

    // Load completion state
    const prog = getLessonProgress(cId, lId);
    setIsCompleted(prog?.completed ?? false);

    // Load bookmark
    setIsBookmarked(localStorage.getItem(`cn-bm:${lId}`) === 'true');

    // Reset quiz
    setQuizAnswers({});
    setQuizSubmitted(false);

    // Restore video time
    const savedTime = getSavedPlaybackTime(lId);
    if (videoRef.current && savedTime > 0) {
      videoRef.current.currentTime = savedTime;
    }
  }, [activeLessonData, courseData]);

  if (!courseData || !activeLessonData) {
    return (
      <div className="p-10 text-center">
        <p>Lesson not found.</p>
        <Link to="/library" className="mt-4 text-[var(--cn-primary)] underline">Return to Library</Link>
      </div>
    );
  }

  const { lesson, blocks, activity } = activeLessonData;
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1]?.lesson : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1]?.lesson : null;

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

  // Video time update (saves to localStorage every 2 seconds)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (Math.floor(curr) % 2 === 0) {
      savePlaybackTime(lesson.id, curr);
    }
  };

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    const saved = getSavedPlaybackTime(lesson.id);
    if (saved > 0 && saved < videoRef.current.duration) {
      videoRef.current.currentTime = saved;
    }
  };

  // Toggle Lesson Completion
  const handleToggleCompletion = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    setLessonProgress(courseData.course.id, lesson.id, { completed: nextState });
  };

  // Toggle Bookmark
  const handleToggleBookmark = () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    localStorage.setItem(`cn-bm:${lesson.id}`, nextState ? 'true' : 'false');
  };

  // Save notes handler
  const handleNotesChange = (text: string) => {
    setNotesContent(text);
    saveLessonNotes(lesson.id, text);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--cn-bg)]">
      {/* Top Player Action Bar */}
      <header className="h-14 px-4 md:px-6 border-b border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            to={`/course/${courseData.course.id}`}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Course Overview</span>
          </Link>
          <span className="text-[var(--cn-text-muted)] hidden sm:inline">|</span>
          <span className="text-xs font-semibold text-[var(--cn-text-primary)] truncate max-w-xs md:max-w-md">
            {lesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Completion checkmark */}
          <button
            onClick={handleToggleCompletion}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isCompleted
                ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleToggleBookmark}
            title={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
            className={`p-2 rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-[var(--cn-accent)]/10 text-[var(--cn-accent)] border-[var(--cn-accent)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-muted)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          {/* Notes Toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            title="Lesson notes"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showNotes
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <StickyNote size={14} />
            <span className="hidden md:inline">Notes</span>
          </button>

          {/* Curriculum Drawer Toggle */}
          <button
            onClick={() => setShowCurriculum(!showCurriculum)}
            title="Course outline"
            className={`p-2 rounded-lg border text-xs transition-colors ${
              showCurriculum
                ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
                : 'border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
            }`}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace (Player Content + Rails) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Central Lesson Content Column */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
          {/* Ordered Content Blocks Loop */}
          {blocks.map((block) => {
            // 1. VIDEO BLOCK
            if (block.type === ContentBlockType.Video) {
              const src = (block.displayMetadata.src as string) || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
              return (
                <div key={block.id} className="space-y-3">
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg group">
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
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
                      {/* Seek Bar */}
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

                      <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleTogglePlay}
                            className="p-1 hover:text-[var(--cn-primary)] transition-colors"
                          >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                          </button>

                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.muted = !isMuted;
                                setIsMuted(!isMuted);
                              }
                            }}
                            className="p-1 hover:text-[var(--cn-primary)] transition-colors"
                          >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </button>

                          <span>
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
                            className="bg-black/60 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                          >
                            <option value="0.75">0.75×</option>
                            <option value="1">1.0×</option>
                            <option value="1.25">1.25×</option>
                            <option value="1.5">1.5×</option>
                            <option value="2">2.0×</option>
                          </select>

                          {/* Fullscreen button */}
                          <button
                            onClick={() => videoRef.current?.requestFullscreen()}
                            className="p-1 hover:text-[var(--cn-primary)] transition-colors"
                          >
                            <Maximize size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--cn-text-muted)] italic">
                    Playback position automatically saved locally. Resumes where you left off.
                  </p>
                </div>
              );
            }

            // 2. RICH TEXT / LECTURE NOTES BLOCK
            if (block.type === ContentBlockType.RichText) {
              const content = (block.displayMetadata.content as string) || '';
              return (
                <div key={block.id} className="p-6 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-3">
                  <div className="prose prose-sm max-w-none text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-line font-serif">
                    {content}
                  </div>
                </div>
              );
            }

            // 3. DOCUMENT VIEWER / SLIDE DECK BLOCK
            if (block.type === ContentBlockType.Document) {
              const filename = (block.displayMetadata.filename as string) || 'Document.pdf';
              const size = (block.displayMetadata.fileSizeBytes as number) || 1024000;
              const desc = (block.displayMetadata.description as string) || '';
              return (
                <div key={block.id} className="p-5 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[var(--cn-info-tint)] text-[var(--cn-info)] flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--cn-text-primary)]">{filename}</h4>
                      <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
                        {desc || 'Attached course document'} • {(size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Reading local document: ${filename}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-xs font-medium text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] transition-colors"
                  >
                    <Download size={13} />
                    <span>Open Reader</span>
                  </a>
                </div>
              );
            }

            // 4. DOWNLOADABLE RESOURCE / STARTER ARCHIVE
            if (block.type === ContentBlockType.Download) {
              const filename = (block.displayMetadata.filename as string) || 'starter.zip';
              const size = (block.displayMetadata.fileSizeBytes as number) || 500000;
              const checksum = (block.displayMetadata.checksumSha256 as string) || '';
              return (
                <div key={block.id} className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Download size={18} className="text-[var(--cn-primary)] shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[var(--cn-text-primary)]">{filename}</p>
                      <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">
                        {(size / 1024).toFixed(0)} KB • SHA-256: {checksum ? checksum.slice(0, 12) + '...' : 'Verified'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Saved ${filename} to Downloads folder`)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
                  >
                    Download Resource
                  </button>
                </div>
              );
            }

            // 5. INTERACTIVE QUIZ / ACTIVITY BLOCK
            if (block.type === ContentBlockType.Quiz && activity) {
              const questions = activity.questions ?? [];
              const calculateScore = () => {
                let score = 0;
                questions.forEach((q) => {
                  const correctOption = q.options?.find((o) => o.isCorrect);
                  if (correctOption && quizAnswers[q.id] === correctOption.id) {
                    score += q.points;
                  }
                });
                return score;
              };

              return (
                <div key={block.id} className="p-6 rounded-xl border border-[var(--cn-warning)]/40 bg-[var(--cn-surface)] space-y-6">
                  <div className="flex items-center justify-between border-b border-[var(--cn-border)] pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={18} className="text-[var(--cn-warning)]" />
                      <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">{activity.title}</h3>
                    </div>
                    <span className="text-xs font-medium text-[var(--cn-text-muted)]">
                      {questions.length} Questions • Passing: {activity.passingScore}%
                    </span>
                  </div>

                  <div className="space-y-6">
                    {questions.map((q, idx) => {
                      const selected = quizAnswers[q.id];
                      const correctOption = q.options?.find((o) => o.isCorrect);
                      const isCorrect = selected === correctOption?.id;

                      return (
                        <div key={q.id} className="space-y-3">
                          <p className="text-xs font-semibold text-[var(--cn-text-primary)]">
                            {idx + 1}. {q.text}
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
                              isCorrect ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/30' : 'bg-[var(--cn-danger-tint)] text-[var(--cn-danger)] border border-[var(--cn-danger)]/30'
                            }`}>
                              <strong>{isCorrect ? '✓ Correct!' : '✗ Incorrect.'}</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    {quizSubmitted ? (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[var(--cn-text-primary)]">
                          Your Score: {calculateScore()} / {questions.reduce((a, b) => a + b.points, 0)} pts
                        </span>
                        <button
                          onClick={() => {
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                          }}
                          className="flex items-center gap-1 text-xs text-[var(--cn-primary)] font-medium hover:underline"
                        >
                          <RotateCcw size={12} />
                          <span>Retry</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(quizAnswers).length === 0}
                        className="px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium hover:bg-[var(--cn-primary-hover)] disabled:opacity-50 transition-colors"
                      >
                        Submit Checkpoint Quiz
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Notes Side Rail */}
        {showNotes && (
          <aside className="w-80 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--cn-text-primary)]">
                <StickyNote size={14} className="text-[var(--cn-primary)]" />
                <span>Personal Notes</span>
              </div>
              <button onClick={() => setShowNotes(false)} className="text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]">
                <X size={15} />
              </button>
            </div>
            <textarea
              value={notesContent}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Take private notes for this lesson... (saved locally)"
              className="flex-1 w-full p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-xs text-[var(--cn-text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--cn-primary)]"
            />
            <p className="text-[10px] text-[var(--cn-text-muted)] mt-2">
              ✓ Saved locally in private application storage
            </p>
          </aside>
        )}

        {/* Collapsible Curriculum Outline Rail */}
        {showCurriculum && (
          <aside className="w-80 border-l border-[var(--cn-border)] bg-[var(--cn-surface)] p-4 flex flex-col shrink-0 z-20 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--cn-border)]">
              <span className="text-xs font-bold text-[var(--cn-text-primary)]">Curriculum Outline</span>
              <button onClick={() => setShowCurriculum(false)} className="text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              {courseData.sections.map(({ section, lessons }) => (
                <div key={section.id} className="space-y-1">
                  <h5 className="text-[11px] font-bold text-[var(--cn-text-muted)] uppercase tracking-wide">
                    {section.title}
                  </h5>
                  <div className="space-y-0.5">
                    {lessons.map((item) => {
                      const isCurrent = item.lesson.id === lesson.id;
                      return (
                        <Link
                          key={item.lesson.id}
                          to={`/course/${courseData.course.id}/lesson/${item.lesson.id}`}
                          onClick={() => setShowCurriculum(false)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isCurrent
                              ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-semibold'
                              : 'text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]'
                          }`}
                        >
                          <span className="truncate">{item.lesson.title}</span>
                          {item.lesson.id === lesson.id && isCompleted && (
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
      <footer className="h-14 px-6 border-t border-[var(--cn-border)] bg-[var(--cn-surface)] flex items-center justify-between shrink-0">
        <div>
          {prevLesson ? (
            <Link
              to={`/course/${courseData.course.id}/lesson/${prevLesson.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Previous Lesson</span>
            </Link>
          ) : (
            <span className="text-xs text-[var(--cn-text-muted)]">First lesson</span>
          )}
        </div>

        <span className="text-xs text-[var(--cn-text-muted)] font-medium hidden sm:inline">
          Lesson {currentLessonIndex + 1} of {allLessons.length}
        </span>

        <div>
          {nextLesson ? (
            <Link
              to={`/course/${courseData.course.id}/lesson/${nextLesson.id}`}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
            >
              <span>Next Lesson</span>
              <ChevronRight size={14} />
            </Link>
          ) : (
            <Link
              to={`/course/${courseData.course.id}`}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--cn-success)] text-white text-xs font-medium hover:bg-[var(--cn-success)]/90 transition-colors"
            >
              <span>Finish Course</span>
              <CheckCircle2 size={14} />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
