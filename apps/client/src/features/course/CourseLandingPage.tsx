import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCourses } from '../../lib/courseStore';
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  FileText, 
  Video, 
  HelpCircle, 
  Download, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export function CourseLandingPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { courses } = useCourses();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const courseData = courses.find((c) => c.course.id === courseId) ?? courses[0];

  if (!courseData) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Course Not Found</h2>
        <Link to="/library" className="mt-4 inline-block text-[var(--cn-primary)] underline">
          Return to Library
        </Link>
      </div>
    );
  }

  const { course, sections } = courseData;
  const firstLesson = sections[0]?.lessons[0]?.lesson;

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Library</span>
        </Link>
      </div>

      {/* Course Hero Banner */}
      <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full font-medium bg-[var(--cn-primary-tint)] text-[var(--cn-primary)]">
                {course.subject}
              </span>
              <span className="text-[var(--cn-text-muted)]">•</span>
              <span className="text-[var(--cn-text-secondary)]">Instructor: {course.instructorName}</span>
              <span className="text-[var(--cn-text-muted)]">•</span>
              <span className="inline-flex items-center gap-1 text-[var(--cn-success)] font-medium">
                <ShieldCheck size={13} />
                <span>Verified Curriculum</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-[var(--cn-text-primary)]">
              {course.title}
            </h1>

            <p className="text-sm text-[var(--cn-text-secondary)] leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--cn-text-secondary)] pt-2">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-[var(--cn-text-muted)]" />
                <span>{course.estimatedDurationMinutes ? `${Math.round(course.estimatedDurationMinutes / 60)} hours total` : 'Self-paced'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-[var(--cn-text-muted)]" />
                <span>{sections.length} Sections • {totalLessons} Lessons</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[var(--cn-success)]" />
                <span>Available Offline</span>
              </div>
            </div>
          </div>

          {/* Call to action panel */}
          <div className="w-full md:w-64 bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] rounded-xl p-5 space-y-4 shrink-0">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--cn-text-muted)]">Course Progress</span>
                <span className="font-semibold text-[var(--cn-text-primary)]">35%</span>
              </div>
              <div className="h-2 w-full bg-[var(--cn-surface)] rounded-full overflow-hidden border border-[var(--cn-border)]">
                <div className="h-full bg-[var(--cn-primary)] rounded-full" style={{ width: '35%' }} />
              </div>
            </div>

            {firstLesson && (
              <Link
                to={`/course/${course.id}/lesson/${firstLesson.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-sm font-medium hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
              >
                <Play size={16} />
                <span>Resume Lesson</span>
              </Link>
            )}

            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
            >
              <Download size={14} />
              <span>Downloaded (128 MB)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {course.learningObjectives && course.learningObjectives.length > 0 && (
        <section className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 space-y-4">
          <h2 className="text-base font-bold text-[var(--cn-text-primary)]">What You Will Learn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {course.learningObjectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--cn-text-secondary)]">
                <CheckCircle2 size={15} className="text-[var(--cn-success)] shrink-0 mt-0.5" />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Curriculum Accordion */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--cn-text-primary)]">Curriculum Outline</h2>
          <span className="text-xs text-[var(--cn-text-muted)] font-medium">
            {sections.length} sections • {totalLessons} lessons
          </span>
        </div>

        <div className="space-y-3">
          {sections.map(({ section, lessons }) => {
            const isCollapsed = collapsedSections[section.id];
            return (
              <div
                key={section.id}
                className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-[var(--cn-surface-subtle)]/50 hover:bg-[var(--cn-surface-subtle)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--cn-text-primary)]">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-xs text-[var(--cn-text-muted)] mt-0.5">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--cn-text-muted)] shrink-0">
                    {lessons.length} lessons
                  </div>
                </button>

                {/* Lessons in Section */}
                {!isCollapsed && (
                  <div className="divide-y divide-[var(--cn-border)]/60">
                    {lessons.map(({ lesson, blocks, activity }) => {
                      const hasVideo = blocks.some((b) => b.type === 'video');
                      const hasDocs = blocks.some((b) => b.type === 'document' || b.type === 'download');
                      const hasQuiz = Boolean(activity);

                      return (
                        <Link
                          key={lesson.id}
                          to={`/course/${course.id}/lesson/${lesson.id}`}
                          className="px-6 py-3.5 flex items-center justify-between hover:bg-[var(--cn-primary-tint)]/30 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border border-[var(--cn-border)] flex items-center justify-center text-[var(--cn-text-muted)] group-hover:border-[var(--cn-primary)] group-hover:text-[var(--cn-primary)]">
                              <Play size={10} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)]">
                                {lesson.title}
                              </p>
                              {lesson.description && (
                                <p className="text-[11px] text-[var(--cn-text-muted)] line-clamp-1">
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Block Badges */}
                          <div className="flex items-center gap-2 text-[11px] text-[var(--cn-text-muted)]">
                            {hasVideo && (
                              <span className="flex items-center gap-1 bg-[var(--cn-surface-subtle)] px-2 py-0.5 rounded border border-[var(--cn-border)]">
                                <Video size={11} />
                                Video
                              </span>
                            )}
                            {hasDocs && (
                              <span className="flex items-center gap-1 bg-[var(--cn-surface-subtle)] px-2 py-0.5 rounded border border-[var(--cn-border)]">
                                <FileText size={11} />
                                Document
                              </span>
                            )}
                            {hasQuiz && (
                              <span className="flex items-center gap-1 bg-[var(--cn-warning-tint)] text-[var(--cn-warning)] px-2 py-0.5 rounded border border-[var(--cn-warning)]/30">
                                <HelpCircle size={11} />
                                Quiz
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
