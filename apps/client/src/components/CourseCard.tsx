import { Link } from 'react-router-dom';
import type { Course } from '@coursenest/domain';
import { DownloadStatus } from '@coursenest/domain';
import { 
  CheckCircle2, 
  CloudDownload, 
  Cloud, 
  Clock, 
  Play, 
  BookOpen, 
  Trash2 
} from 'lucide-react';

interface CourseCardProps {
  course: Course;
  progressPercent?: number;
  lastLessonId?: string;
  onRemoveDownload?: (courseId: string) => void;
  viewMode?: 'grid' | 'list';
}

export function CourseCard({
  course,
  progressPercent = 0,
  lastLessonId,
  onRemoveDownload,
  viewMode = 'grid',
}: CourseCardProps) {
  const isDownloaded = course.localAvailability === DownloadStatus.Downloaded;
  const isDownloading = course.localAvailability === DownloadStatus.Downloading;

  const durationHours = course.estimatedDurationMinutes 
    ? `${Math.round(course.estimatedDurationMinutes / 60)}h` 
    : null;

  return (
    <div
      className={`rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] overflow-hidden transition-shadow hover:shadow-md flex ${
        viewMode === 'list' ? 'flex-row items-center p-4 gap-6' : 'flex-col'
      }`}
    >
      {/* Thumbnail or Fallback Header */}
      <div
        className={`${
          viewMode === 'list'
            ? 'w-48 h-32 rounded-lg shrink-0'
            : 'w-full h-40'
        } bg-gradient-to-br from-[var(--cn-primary-tint)] to-[var(--cn-surface-subtle)] flex items-center justify-center relative border-b border-[var(--cn-border)]`}
      >
        <BookOpen size={36} className="text-[var(--cn-primary)] opacity-40" />

        {/* Offline / Download status badge (always icon + text) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--cn-surface)]/90 backdrop-blur-sm border border-[var(--cn-border)]">
          {isDownloaded ? (
            <>
              <CheckCircle2 size={12} className="text-[var(--cn-success)]" />
              <span className="text-[var(--cn-text-secondary)]">Available Offline</span>
            </>
          ) : isDownloading ? (
            <>
              <CloudDownload size={12} className="text-[var(--cn-info)] animate-pulse" />
              <span className="text-[var(--cn-text-secondary)]">Downloading</span>
            </>
          ) : (
            <>
              <Cloud size={12} className="text-[var(--cn-text-muted)]" />
              <span className="text-[var(--cn-text-secondary)]">Online Only</span>
            </>
          )}
        </div>
      </div>

      {/* Course Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-[var(--cn-text-muted)]">
            <span>{course.subject || 'General'}</span>
            {durationHours && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {durationHours}
                </span>
              </>
            )}
          </div>

          <h3 className="font-semibold text-base text-[var(--cn-text-primary)] line-clamp-1 mb-1">
            {course.title}
          </h3>

          <p className="text-xs text-[var(--cn-text-secondary)] line-clamp-2 mb-4">
            {course.description}
          </p>
        </div>

        <div>
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--cn-text-muted)]">Progress</span>
              <span className="font-medium text-[var(--cn-text-secondary)]">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--cn-surface-subtle)] rounded-full overflow-hidden border border-[var(--cn-border)]">
              <div
                className="h-full bg-[var(--cn-primary)] rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--cn-border)]/60">
            <Link
              to={lastLessonId ? `/course/${course.id}/lesson/${lastLessonId}` : `/course/${course.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cn-primary)] text-white text-xs font-medium hover:bg-[var(--cn-primary-hover)] transition-colors"
            >
              <Play size={13} />
              <span>{progressPercent > 0 ? 'Resume Lesson' : 'Start Course'}</span>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                to={`/course/${course.id}`}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--cn-border)] text-xs text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)] transition-colors"
              >
                Overview
              </Link>

              {isDownloaded && onRemoveDownload && (
                <button
                  onClick={() => onRemoveDownload(course.id)}
                  title="Remove local media files (keeps learning records)"
                  aria-label="Remove downloaded course files"
                  className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-danger)] hover:bg-[var(--cn-danger-tint)] transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
