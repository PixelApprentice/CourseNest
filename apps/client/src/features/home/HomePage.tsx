import { Link } from 'react-router-dom';
import { useCourses } from '../../lib/courseStore';
import { CourseCard } from '../../components/CourseCard';
import { APP_NAME } from '@coursenest/config';
import { 
  Play, 
  Upload, 
  Library, 
  BookOpen, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function HomePage() {
  const { courses } = useCourses();

  // Find a course to continue
  const continueCourse = courses[0];
  const firstSection = continueCourse?.sections[0];
  const firstLesson = firstSection?.lessons[0];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-[var(--cn-surface)] to-[var(--cn-surface-subtle)] border border-[var(--cn-border)] rounded-2xl p-6 md:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] mb-4">
            <Sparkles size={13} />
            <span>Local-First Learning Environment</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--cn-text-primary)] mb-2">
            Welcome to {APP_NAME}
          </h1>
          <p className="text-sm md:text-base text-[var(--cn-text-secondary)] leading-relaxed mb-6">
            Study uninterrupted without internet access. Import your archives, PDFs, and slide decks, 
            or continue studying your offline-ready university curriculum.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/import"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-sm font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
            >
              <Upload size={16} />
              <span>Import Course Materials</span>
            </Link>
            <Link
              to="/library"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface)] text-sm font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
            >
              <Library size={16} />
              <span>Browse Library ({courses.length})</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Continue Learning Card */}
      {continueCourse && firstLesson && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--cn-text-primary)] flex items-center gap-2">
              <Play size={18} className="text-[var(--cn-primary)]" />
              <span>Continue Learning</span>
            </h2>
            <Link
              to={`/course/${continueCourse.course.id}`}
              className="text-xs text-[var(--cn-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Course overview</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="border border-[var(--cn-border)] rounded-xl bg-[var(--cn-surface)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-xs text-[var(--cn-text-muted)]">
                <span className="font-medium text-[var(--cn-primary)]">{continueCourse.course.subject}</span>
                <span>•</span>
                <span>{firstSection?.section.title}</span>
              </div>
              <h3 className="text-lg font-semibold text-[var(--cn-text-primary)]">
                {firstLesson.lesson.title}
              </h3>
              <p className="text-xs text-[var(--cn-text-secondary)] line-clamp-2">
                {firstLesson.lesson.description}
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
              <Link
                to={`/course/${continueCourse.course.id}/lesson/${firstLesson.lesson.id}`}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--cn-primary)] text-white text-sm font-medium hover:bg-[var(--cn-primary-hover)] transition-colors shadow-sm"
              >
                <Play size={16} />
                <span>Resume Lesson</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* My Courses Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--cn-text-primary)] flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--cn-primary)]" />
            <span>My Courses Available Offline</span>
          </h2>
          <Link
            to="/library"
            className="text-xs text-[var(--cn-primary)] hover:underline font-medium"
          >
            View all
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="border border-dashed border-[var(--cn-border)] rounded-xl p-10 text-center bg-[var(--cn-surface)]">
            <BookOpen size={40} className="mx-auto mb-3 text-[var(--cn-text-muted)]" />
            <p className="font-semibold text-sm text-[var(--cn-text-primary)]">No courses imported yet</p>
            <p className="text-xs text-[var(--cn-text-muted)] mt-1 mb-4">
              Import a course archive or folder to start learning offline.
            </p>
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium"
            >
              <Upload size={14} />
              <span>Import your first course</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map(({ course, sections }) => (
              <CourseCard
                key={course.id}
                course={course}
                progressPercent={course.id === 'course-cs101' ? 45 : 15}
                lastLessonId={sections[0]?.lessons[0]?.lesson.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Value Pillars (Offline Guarantee) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--cn-border)]">
        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cn-text-primary)]">
            <CheckCircle2 size={16} className="text-[var(--cn-success)]" />
            <span>100% Offline Capable</span>
          </div>
          <p className="text-xs text-[var(--cn-text-muted)]">
            Videos, PDFs, slides, and notes run completely off local disk.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cn-text-primary)]">
            <CheckCircle2 size={16} className="text-[var(--cn-success)]" />
            <span>Local-First Storage</span>
          </div>
          <p className="text-xs text-[var(--cn-text-muted)]">
            Progress and bookmarks survive app restarts without server sync.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cn-text-primary)]">
            <CheckCircle2 size={16} className="text-[var(--cn-success)]" />
            <span>Safe Archive Import</span>
          </div>
          <p className="text-xs text-[var(--cn-text-muted)]">
            Zip Slip protected, duplicate hashing, and deterministic sequencing.
          </p>
        </div>
      </section>
    </div>
  );
}
