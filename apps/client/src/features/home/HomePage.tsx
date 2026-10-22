import { Link } from 'react-router-dom';
import { useVaultCourses, getCourseProgressPercent, getVaultAnalytics, type CourseData } from '../../lib/courseStore';
import { CourseCard } from '../../components/CourseCard';
import { 
  IconPlayerPlay, 
  IconUpload, 
  IconBooks, 
  IconBook, 
  IconCircleCheck, 
  IconShieldCheck,
  IconArrowRight,
  IconDeviceFloppy,
  IconNote,
  IconAward,
  IconBolt
} from '@tabler/icons-react';
import { APP_NAME } from '@coursenest/config';

export function HomePage() {
  const { courses } = useVaultCourses();
  const analytics = getVaultAnalytics();

  const sortedCourses = [...courses].sort((a: CourseData, b: CourseData) => {
    return getCourseProgressPercent(b) - getCourseProgressPercent(a);
  });

  const activeCourseData = sortedCourses[0];
  const activeProgress = activeCourseData ? getCourseProgressPercent(activeCourseData) : 0;
  const firstSection = activeCourseData?.sections[0];
  const resumeLesson = firstSection?.lessons[0];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] p-6 md:p-8">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(var(--cn-primary) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border border-[var(--cn-primary)]/30">
            <IconShieldCheck size={14} />
            <span>PRIVATE OFFLINE LEARNING</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[var(--cn-text-primary)]">
            Focus deeply without digital noise.
          </h1>

          <p className="text-sm md:text-base text-[var(--cn-text-secondary)] leading-relaxed">
            {APP_NAME} turns your computer into a distraction-free offline study space. All videos, lecture notes,
            slide decks, and checkpoint assessments execute 100% locally from your machine.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/import"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--cn-primary)] text-[#0A0A0B] text-xs font-bold hover:bg-[#69D475] transition-colors shadow-sm"
            >
              <IconUpload size={15} />
              <span>Add Course Materials</span>
            </Link>
            <Link
              to="/library"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface)] hover:text-[var(--cn-text-primary)] transition-colors"
            >
              <IconBooks size={15} />
              <span>My Courses ({courses.length})</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Learning Progress Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center justify-between text-[var(--cn-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Courses</span>
            <IconBook size={15} className="text-[var(--cn-primary)]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--cn-text-primary)]">{analytics.totalCourses}</p>
          <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">{analytics.totalLessons} lessons total</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center justify-between text-[var(--cn-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Lessons Done</span>
            <IconAward size={15} className="text-[var(--cn-success)]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--cn-text-primary)]">{analytics.completedLessons}</p>
          <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">Completed offline</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center justify-between text-[var(--cn-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider">My Notes</span>
            <IconNote size={15} className="text-[var(--cn-accent)]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--cn-text-primary)]">{analytics.notesCount}</p>
          <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">Saved on your device</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1">
          <div className="flex items-center justify-between text-[var(--cn-text-muted)]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Storage Used</span>
            <IconDeviceFloppy size={15} className="text-[var(--cn-primary)]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--cn-text-primary)]">{analytics.estimatedStorageMB} MB</p>
          <p className="text-[10px] text-[var(--cn-text-muted)] font-mono">100% offline & private</p>
        </div>
      </section>

      {/* Continue Learning */}
      {activeCourseData && resumeLesson && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)] flex items-center gap-2">
              <IconBolt size={15} className="text-[var(--cn-primary)]" />
              <span>Continue Learning</span>
            </h2>
            <Link
              to={`/course/${activeCourseData.id}`}
              className="text-xs text-[var(--cn-primary)] hover:underline flex items-center gap-1 font-mono font-medium"
            >
              <span>View Course Lessons</span>
              <IconArrowRight size={13} />
            </Link>
          </div>

          <div className="border border-[var(--cn-border)] rounded-2xl bg-[var(--cn-surface)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[var(--cn-border-highlight)] transition-colors">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] font-semibold">
                  {activeCourseData.subject}
                </span>
                <span className="text-[var(--cn-text-muted)]">•</span>
                <span className="text-[var(--cn-text-secondary)]">{activeCourseData.title}</span>
              </div>

              <h3 className="text-lg font-bold text-[var(--cn-text-primary)]">
                {resumeLesson.title}
              </h3>

              <p className="text-xs text-[var(--cn-text-secondary)] line-clamp-2 leading-relaxed">
                {resumeLesson.description || 'Continue your self-paced study with video lecture, lecture slides, and checkpoints.'}
              </p>

              {/* Progress preview */}
              <div className="flex items-center gap-3 pt-1">
                <div className="h-1.5 w-32 bg-[var(--cn-surface-subtle)] rounded-full overflow-hidden border border-[var(--cn-border)]">
                  <div
                    className="h-full bg-[var(--cn-primary)] rounded-full"
                    style={{ width: `${activeProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-[var(--cn-text-muted)]">
                  {activeProgress}% Completed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <Link
                to={`/course/${activeCourseData.id}/lesson/${resumeLesson.id}`}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-all shadow-sm"
              >
                <IconPlayerPlay size={14} />
                <span>Resume Lesson</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Vault Courses Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)] flex items-center gap-2">
            <IconBook size={15} className="text-[var(--cn-primary)]" />
            <span>My Courses</span>
          </h2>
          <Link
            to="/library"
            className="text-xs font-mono text-[var(--cn-primary)] hover:underline font-medium"
          >
            View All ({courses.length})
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="border border-dashed border-[var(--cn-border)] rounded-2xl p-12 text-center bg-[var(--cn-surface)] space-y-4">
            <IconBook size={40} className="mx-auto text-[var(--cn-text-muted)]" />
            <div>
              <p className="font-bold text-sm text-[var(--cn-text-primary)]">Your vault is currently empty</p>
              <p className="text-xs text-[var(--cn-text-muted)] mt-1">
                Add a course archive or folder to begin learning completely offline.
              </p>
            </div>
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium"
            >
              <IconUpload size={14} />
              <span>Add First Course</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course: CourseData) => {
              const progress = getCourseProgressPercent(course);
              const totalLessons = course.sections.reduce((acc: number, s) => acc + s.lessons.length, 0);

              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  progressPercent={progress}
                  totalSections={course.sections.length}
                  totalLessons={totalLessons}
                  lastLessonId={course.sections[0]?.lessons[0]?.id}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Academic Guarantees */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[var(--cn-border)]">
        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs text-[var(--cn-text-primary)]">
            <IconCircleCheck size={15} className="text-[var(--cn-success)]" />
            <span>Deterministic Storage</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
            Content is validated with cryptographic hashes. Deduplication saves disk space.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs text-[var(--cn-text-primary)]">
            <IconCircleCheck size={15} className="text-[var(--cn-success)]" />
            <span>Zero Tracking & Privacy</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
            No telemetry, no tracking, and no ads. Your learning data stays on your machine.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs text-[var(--cn-text-primary)]">
            <IconCircleCheck size={15} className="text-[var(--cn-success)]" />
            <span>Safe Archive Extraction</span>
          </div>
          <p className="text-[11px] text-[var(--cn-text-muted)] leading-relaxed">
            Every ZIP or archive is decompressed inside sandboxed boundaries with path traversal protection.
          </p>
        </div>
      </section>
    </div>
  );
}
