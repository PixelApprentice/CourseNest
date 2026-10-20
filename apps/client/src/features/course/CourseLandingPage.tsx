import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVaultCourses, getCourseProgressPercent, getLessonProgress, type CourseData, type SectionData, type LessonData } from '../../lib/courseStore';
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Video, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  Check, 
  Layers, 
  HardDrive 
} from 'lucide-react';

export function CourseLandingPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { courses } = useVaultCourses();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const course = courses.find((c: CourseData) => c.id === courseId) ?? courses[0];

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
          <ArrowLeft size={14} />
          <span>Return to Vault Directory</span>
        </Link>
      </div>

      {/* Course Dossier Hero Banner */}
      <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded font-semibold bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30">
                {course.subject}
              </span>
              <span className="text-[var(--cn-text-muted)]">•</span>
              <span className="text-[var(--cn-text-secondary)]">Instructor: {course.instructorName}</span>
              <span className="text-[var(--cn-text-muted)]">•</span>
              <span className="inline-flex items-center gap-1 text-[var(--cn-success)] font-medium">
                <ShieldCheck size={13} />
                <span>Verified Local Manifest</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
              {course.title}
            </h1>

            <p className="text-xs md:text-sm text-[var(--cn-text-secondary)] leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-[var(--cn-text-secondary)] pt-2 border-t border-[var(--cn-border)]/60">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-[var(--cn-primary)]" />
                <span>{course.estimatedDurationMinutes ? `${(course.estimatedDurationMinutes / 60).toFixed(1)}h total study` : 'Self-paced'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers size={13} className="text-[var(--cn-primary)]" />
                <span>{course.sections.length} Modules • {totalLessons} Lessons</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HardDrive size={13} className="text-[var(--cn-success)]" />
                <span>100% Offline Capable</span>
              </div>
            </div>
          </div>

          {/* Call to action panel */}
          <div className="w-full md:w-68 bg-[var(--cn-bg)] border border-[var(--cn-border)] rounded-xl p-5 space-y-4 shrink-0">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--cn-text-muted)]">Course Mastery</span>
                <span className="font-semibold text-[var(--cn-text-primary)]">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-[var(--cn-surface-subtle)] rounded-full overflow-hidden border border-[var(--cn-border)]">
                <div
                  className="h-full bg-[var(--cn-primary)] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {resumeLesson && (
              <Link
                to={`/course/${course.id}/lesson/${resumeLesson.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
              >
                <Play size={14} fill="currentColor" />
                <span>{progressPercent > 0 ? 'Resume Lesson' : 'Start Course'}</span>
              </Link>
            )}

            <div className="p-3 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-[11px] font-mono text-[var(--cn-text-muted)] flex items-center gap-2">
              <CheckCircle2 size={13} className="text-[var(--cn-success)]" />
              <span>All assets stored in local vault</span>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {course.learningObjectives && course.learningObjectives.length > 0 && (
        <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 space-y-4">
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)]">
            Core Competencies & Objectives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {course.learningObjectives.map((obj: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--cn-text-secondary)]">
                <CheckCircle2 size={14} className="text-[var(--cn-success)] shrink-0 mt-0.5" />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Curriculum Accordion */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)]">
            Curriculum Outline ({course.sections.length} Modules)
          </h2>
          <span className="text-xs font-mono text-[var(--cn-text-muted)]">
            {totalLessons} lessons total
          </span>
        </div>

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
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
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
                    <span>{sectionCompletedCount}/{section.lessons.length} Completed</span>
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
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                              isDone
                                ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border border-[var(--cn-success)]/40'
                                : 'border border-[var(--cn-border)] text-[var(--cn-text-muted)] group-hover:border-[var(--cn-primary)] group-hover:text-[var(--cn-primary)]'
                            }`}>
                              {isDone ? <Check size={12} /> : <Play size={10} fill="currentColor" />}
                            </div>
                            <div>
                              <p className={`text-xs font-semibold ${isDone ? 'text-[var(--cn-text-muted)] line-through' : 'text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)]'}`}>
                                {lesson.title}
                              </p>
                              {lesson.description && (
                                <p className="text-[11px] text-[var(--cn-text-muted)] line-clamp-1 mt-0.5">
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Block Badges */}
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--cn-text-muted)]">
                            {hasVideo && (
                              <span className="flex items-center gap-1 bg-[var(--cn-surface)] px-2 py-0.5 rounded border border-[var(--cn-border)]">
                                <Video size={10} />
                                Video
                              </span>
                            )}
                            {hasDocs && (
                              <span className="flex items-center gap-1 bg-[var(--cn-surface)] px-2 py-0.5 rounded border border-[var(--cn-border)]">
                                <FileText size={10} />
                                Slide / PDF
                              </span>
                            )}
                            {hasQuiz && (
                              <span className="flex items-center gap-1 bg-[var(--cn-accent)]/10 text-[var(--cn-accent)] px-2 py-0.5 rounded border border-[var(--cn-accent)]/30">
                                <HelpCircle size={10} />
                                Checkpoint
                              </span>
                            )}
                            {lesson.estimatedDurationMinutes && (
                              <span>{lesson.estimatedDurationMinutes}m</span>
                            )}
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
      </section>
    </div>
  );
}
