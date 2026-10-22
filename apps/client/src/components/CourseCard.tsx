import { Link } from 'react-router-dom';
import type { CourseData } from '../lib/courseStore';
import { 
  IconCircleCheck, 
  IconClock, 
  IconPlayerPlay, 
  IconStack2, 
  IconTrash,
  IconDeviceFloppy,
  IconFileText
} from '@tabler/icons-react';

interface CourseCardProps {
  course: CourseData;
  progressPercent?: number;
  lastLessonId?: string;
  totalLessons?: number;
  totalSections?: number;
  onRemoveDownload?: (courseId: string) => void;
  viewMode?: 'grid' | 'list';
}

export function CourseCard({
  course,
  progressPercent = 0,
  lastLessonId,
  totalLessons = 4,
  totalSections = 2,
  onRemoveDownload,
  viewMode = 'grid',
}: CourseCardProps) {
  const durationHours = course.estimatedDurationMinutes 
    ? `${(course.estimatedDurationMinutes / 60).toFixed(1)}h` 
    : null;

  const codeMatch = course.id ? course.id.match(/([a-zA-Z]+)(\d+)/) : null;
  const courseCode = (codeMatch && codeMatch[1] && codeMatch[2])
    ? `${codeMatch[1].toUpperCase()}-${codeMatch[2]}`
    : 'COURSE';

  return (
    <div
      className={`group relative rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-[var(--cn-border-highlight)] transition-all duration-200 overflow-hidden flex ${
        viewMode === 'list' ? 'flex-row items-center p-5 gap-6' : 'flex-col'
      }`}
    >
      {/* Header / Preview Area */}
      <div
        className={`${
          viewMode === 'list'
            ? 'w-52 h-36 rounded-lg shrink-0'
            : 'w-full h-36'
        } relative overflow-hidden bg-[var(--cn-bg)] border-b border-[var(--cn-border)] flex flex-col justify-between p-4`}
      >
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(var(--cn-border) 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--cn-surface)] border border-[var(--cn-border)] text-[var(--cn-primary)] shadow-xs">
            {courseCode}
          </span>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--cn-surface)]/90 backdrop-blur-xs border border-[var(--cn-border)] text-[var(--cn-success)]">
            <IconCircleCheck size={12} className="text-[var(--cn-success)]" />
            <span>OFFLINE VAULT</span>
          </div>
        </div>

        {/* Course Info Preview */}
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--cn-text-muted)] font-mono">
              {course.subject || 'Course'}
            </span>
            <p className="text-xs font-medium text-[var(--cn-text-secondary)]">
              {course.instructorName}
            </p>
          </div>

          <div className="text-[10px] font-mono text-[var(--cn-text-muted)] flex items-center gap-1">
            <IconDeviceFloppy size={12} />
            <span>Local Vault</span>
          </div>
        </div>
      </div>

      {/* Course Info & Progress */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-sans font-bold text-base text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)] transition-colors line-clamp-1 mb-1.5">
            {course.title}
          </h3>

          <p className="text-xs text-[var(--cn-text-secondary)] line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        {/* Curriculum Metadata */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--cn-text-muted)] pt-1 border-t border-[var(--cn-border)]/60">
          <span className="flex items-center gap-1.5">
            <IconStack2 size={13} className="text-[var(--cn-primary)]" />
            {totalSections} Chapters
          </span>
          <span className="flex items-center gap-1.5">
            <IconFileText size={13} className="text-[var(--cn-primary)]" />
            {totalLessons} Lessons
          </span>
          {durationHours && (
            <span className="flex items-center gap-1.5">
              <IconClock size={13} className="text-[var(--cn-primary)]" />
              {durationHours}
            </span>
          )}
        </div>

        {/* Learning Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-[var(--cn-text-muted)]">Progress</span>
            <span className="font-semibold text-[var(--cn-text-primary)]">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--cn-surface-subtle)] rounded-full overflow-hidden border border-[var(--cn-border)]">
            <div
              className="h-full bg-[var(--cn-primary)] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--cn-border)]/60">
          <Link
            to={lastLessonId ? `/course/${course.id}/lesson/${lastLessonId}` : `/course/${course.id}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-semibold hover:bg-[var(--cn-primary-hover)] transition-colors shadow-xs"
          >
            <IconPlayerPlay size={13} />
            <span>{progressPercent > 0 ? 'Resume' : 'Start'}</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              to={`/course/${course.id}`}
              className="px-3 py-1.5 rounded-lg border border-[var(--cn-border)] text-xs font-medium text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] hover:text-[var(--cn-text-primary)] transition-colors"
            >
              Overview
            </Link>

            {onRemoveDownload && (
              <button
                onClick={() => onRemoveDownload(course.id)}
                title="Remove course from library"
                aria-label="Remove course from library"
                className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] hover:bg-[var(--cn-danger-tint)] transition-colors"
              >
                <IconTrash size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
