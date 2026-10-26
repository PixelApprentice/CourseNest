import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  useVaultCourses, 
  getCourseProgressPercent, 
  getLessonProgress, 
  updateCourseTitle,
  deleteCourseFromVault,
  type CourseData, 
  type SectionData, 
  type LessonData 
} from '../../lib/courseStore';
import { StatusBadge } from '../../components/StatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { CurriculumRoadmapDiagram } from '../../components/CurriculumRoadmapDiagram';
import { 
  IconArrowLeft, 
  IconPlayerPlay, 
  IconClock, 
  IconCircleCheck, 
  IconFileText, 
  IconVideo, 
  IconHelp, 
  IconChevronDown, 
  IconChevronRight, 
  IconShieldCheck, 
  IconCheck, 
  IconStack2, 
  IconDeviceFloppy,
  IconGitFork,
  IconList,
  IconPencil,
  IconTrash,
  IconFolderPlus,
  IconX,
  IconAlertTriangle
} from '@tabler/icons-react';

export function CourseLandingPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses } = useVaultCourses();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('diagram');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const course = courses.find((c: CourseData) => c.id === courseId) ?? courses[0];

  const handleStartEdit = () => {
    if (course) {
      setEditedTitle(course.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    if (course && editedTitle.trim()) {
      updateCourseTitle(course.id, editedTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    setIsDeleting(true);
    try {
      await deleteCourseFromVault(course.id);
      setShowDeleteModal(false);
      navigate('/library');
    } catch (err) {
      console.error('Failed to delete course:', err);
      setIsDeleting(false);
    }
  };

  if (!course) {
    return (
      <div className="p-10 text-center space-y-4">
        <h2 className="text-xl font-bold text-[var(--cn-text-primary)]">Course Not Found in Local Vault</h2>
        <Link to="/library" className="inline-block text-xs font-mono text-[var(--cn-primary)] underline">
          Return to Course Vault
        </Link>
      </div>
    );
  }

  const progressPercent = getCourseProgressPercent(course);
  const totalLessons = course.sections.reduce((acc: number, s: SectionData) => acc + s.lessons.length, 0);

  // Find first uncompleted lesson or first lesson
  let resumeLesson: LessonData | undefined = course.sections[0]?.lessons[0];
  for (const s of course.sections) {
    for (const l of s.lessons) {
      const prog = getLessonProgress(course.id, l.id);
      if (!prog?.completed) {
        resumeLesson = l;
        break;
      }
    }
    if (resumeLesson && !getLessonProgress(course.id, resumeLesson.id)?.completed) break;
  }

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 text-xs font-mono font-medium text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] transition-colors"
        >
          <IconArrowLeft size={14} />
          <span>Back to My Courses</span>
        </Link>
      </div>

      {/* Course Hero Banner */}
      <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <StatusBadge tone="success" label={course.subject} showDot={false} />
              <span className="text-[var(--cn-text-muted)]">•</span>
              <span className="text-[var(--cn-text-secondary)]">Instructor: {course.instructorName}</span>
              <span className="text-[var(--cn-text-muted)]">•</span>
              <span className="inline-flex items-center gap-1 text-[var(--cn-success)] font-medium">
                <IconShieldCheck size={14} />
                <span>Saved Offline & Ready</span>
              </span>
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                  className="flex-1 px-3 py-1.5 text-xl font-bold bg-[var(--cn-bg)] border border-[var(--cn-primary)] rounded-lg text-[var(--cn-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cn-primary)]/30 font-sans"
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 rounded-lg bg-[var(--cn-primary)] text-white hover:bg-[var(--cn-primary-hover)] transition-colors"
                  title="Save Title"
                  aria-label="Save Title"
                >
                  <IconCheck size={18} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
                  title="Cancel Edit"
                  aria-label="Cancel Edit"
                >
                  <IconX size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)] flex-1">
                  {course.title}
                </h1>
                <div className="flex items-center gap-1.5 shrink-0 pt-1">
                  <Link
                    to={`/import?courseId=${course.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-primary)] hover:border-[var(--cn-primary)]/50 text-xs font-mono font-medium transition-colors"
                    title="Append supplementary chapters, ZIP packages, or folders to this course"
                  >
                    <IconFolderPlus size={15} className="text-[var(--cn-primary)]" />
                    <span className="hidden sm:inline">Add Materials</span>
                  </Link>
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface-subtle)] hover:border-[var(--cn-border-highlight)] transition-colors"
                    title="Edit course title"
                    aria-label="Edit course title"
                  >
                    <IconPencil size={15} />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:text-white hover:bg-red-500/90 transition-colors"
                    title="Delete course and purge files"
                    aria-label="Delete course and purge files"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-[var(--cn-text-secondary)] pt-2 border-t border-[var(--cn-border)]/60">
              <div className="flex items-center gap-1.5">
                <IconClock size={14} className="text-[var(--cn-primary)]" />
                <span>{course.estimatedDurationMinutes ? `${(course.estimatedDurationMinutes / 60).toFixed(1)}h total study` : 'Self-paced'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconStack2 size={14} className="text-[var(--cn-primary)]" />
                <span>{course.sections.length} Chapters • {totalLessons} Lessons</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconDeviceFloppy size={14} className="text-[var(--cn-success)]" />
                <span>100% Offline Capable</span>
              </div>
            </div>
          </div>

          {/* Call to action panel */}
          <div className="w-full md:w-68 bg-[var(--cn-bg)] border border-[var(--cn-border)] rounded-xl p-5 space-y-4 shrink-0">
            {(course.thumbnailUrl || course.coverImageUrl) && (
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-[var(--cn-border)] relative shadow-xs">
                <img
                  src={course.thumbnailUrl || course.coverImageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <ProgressBar
              value={progressPercent}
              label="Course Progress"
              showValueText={true}
              size="md"
              tone="primary"
            />

            {resumeLesson && (
              <Link
                to={`/course/${course.id}/lesson/${resumeLesson.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-[var(--cn-primary-text)] text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-[background-color,transform] duration-150 ease-out active:scale-95 shadow-sm"
              >
                <IconPlayerPlay size={14} />
                <span>{progressPercent > 0 ? 'Resume Lesson' : 'Start Course'}</span>
              </Link>
            )}

            <div className="p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-[11px] font-mono text-[var(--cn-text-muted)] flex items-center gap-2">
              <IconCircleCheck size={14} className="text-[var(--cn-success)]" />
              <span>Stored on your device for offline study</span>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {course.learningObjectives && course.learningObjectives.length > 0 && (
        <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 space-y-4">
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)]">
            What You'll Learn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {course.learningObjectives.map((obj: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--cn-text-secondary)]">
                <IconCircleCheck size={14} className="text-[var(--cn-success)] shrink-0 mt-0.5" />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* View Mode Switcher Header */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)]">
              Course Lessons ({course.sections.length} Chapters • {totalLessons} Lessons)
            </h2>
          </div>

          {/* Toggle between Interactive Progress Diagram & Standard List */}
          <div className="inline-flex rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] p-0.5 self-start">
            <button
              onClick={() => setViewMode('diagram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-95 ${
                viewMode === 'diagram'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-bold shadow-xs'
                  : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
              }`}
            >
              <IconGitFork size={13} />
              <span>Progress Diagram</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-95 ${
                viewMode === 'list'
                  ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-bold shadow-xs'
                  : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
              }`}
            >
              <IconList size={13} />
              <span>Chapter List</span>
            </button>
          </div>
        </div>

        {/* Conditional View Rendering */}
        {viewMode === 'diagram' ? (
          <CurriculumRoadmapDiagram course={course} />
        ) : (
          <div className="space-y-3">
            {course.sections.map((section: SectionData) => {
              const isCollapsed = collapsedSections[section.id];
              const sectionCompletedCount = section.lessons.filter((l: LessonData) => getLessonProgress(course.id, l.id)?.completed).length;

              return (
                <div
                  key={section.id}
                  className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-[var(--cn-surface-subtle)]/40 hover:bg-[var(--cn-surface-subtle)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                      <div>
                        <h3 className="font-bold text-sm text-[var(--cn-text-primary)]">
                          {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
                            {section.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[var(--cn-text-muted)] shrink-0 flex items-center gap-2">
                      <StatusBadge
                        tone={sectionCompletedCount === section.lessons.length ? 'success' : 'neutral'}
                        size="sm"
                        label={`${sectionCompletedCount}/${section.lessons.length} Completed`}
                      />
                    </div>
                  </button>

                  {/* Lessons in Section */}
                  {!isCollapsed && (
                    <div className="divide-y divide-[var(--cn-border)]/60">
                      {section.lessons.map((lesson: LessonData) => {
                        const hasVideo = lesson.blocks.some((b) => b.type === 'video');
                        const hasDocs = lesson.blocks.some((b) => b.type === 'document' || b.type === 'downloadable_asset');
                        const hasQuiz = Boolean(lesson.quiz);
                        const isDone = getLessonProgress(course.id, lesson.id)?.completed;

                        return (
                          <Link
                            key={lesson.id}
                            to={`/course/${course.id}/lesson/${lesson.id}`}
                            className="px-6 py-3.5 flex items-center justify-between hover:bg-[var(--cn-surface-subtle)] transition-colors group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                                  isDone
                                    ? 'bg-[var(--cn-primary)] border-[var(--cn-primary)] text-white'
                                    : 'border-[var(--cn-border)] text-[var(--cn-text-muted)] group-hover:border-[var(--cn-text-secondary)]'
                                }`}
                              >
                                {isDone ? <IconCheck size={12} strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)] transition-colors truncate">
                                  {lesson.title}
                                </p>
                                {lesson.description && (
                                  <p className="text-[11px] text-[var(--cn-text-muted)] truncate">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-[var(--cn-text-muted)]">
                              <div className="flex items-center gap-1.5">
                                {hasVideo && <span title="Contains video lecture"><IconVideo size={13} className="text-[var(--cn-primary)]" /></span>}
                                {hasDocs && <span title="Contains document or reading"><IconFileText size={13} className="text-sky-400" /></span>}
                                {hasQuiz && <span title="Contains quiz assessment"><IconHelp size={13} className="text-[var(--cn-accent)]" /></span>}
                              </div>

                              {lesson.estimatedDurationMinutes && (
                                <span>{lesson.estimatedDurationMinutes}m</span>
                              )}

                              <IconChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Course Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="border border-red-500/30 bg-[var(--cn-surface)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <IconAlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--cn-text-primary)]">
                  Delete Course & Purge Storage?
                </h3>
                <p className="text-xs text-[var(--cn-text-muted)] leading-relaxed">
                  Permanently delete <strong className="text-[var(--cn-text-primary)] font-semibold">{course.title}</strong> and erase all downloaded videos, PDFs, and notes from your local storage vault.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] text-[11px] font-mono text-[var(--cn-text-muted)] space-y-1">
              <p className="text-red-400 font-semibold">• Deletes course curriculum metadata</p>
              <p className="text-red-400 font-semibold">• Cleans all binary blobs from IndexedDB</p>
              <p className="text-red-400 font-semibold">• Clears notes, bookmarks, and quiz progress</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-[var(--cn-border)] text-xs font-mono font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <IconTrash size={14} />
                    <span>Delete & Purge Storage</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
