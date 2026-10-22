import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  IconCircleCheck, 
  IconPlayerPlay, 
  IconClock, 
  IconVideo, 
  IconFileText, 
  IconHelp, 
  IconChevronRight, 
  IconChevronDown
} from '@tabler/icons-react';
import { 
  type CourseData, 
  type SectionData, 
  type LessonData, 
  getLessonProgress, 
  getQuizResult 
} from '../lib/courseStore';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import clsx from 'clsx';

export interface CurriculumRoadmapDiagramProps {
  course: CourseData;
  activeLessonId?: string;
  className?: string;
}

export function CurriculumRoadmapDiagram({
  course,
  activeLessonId,
  className,
}: CurriculumRoadmapDiagramProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const getContentTypeIcon = (type: 'video' | 'quiz' | 'article') => {
    switch (type) {
      case 'video':
        return <IconVideo size={13} className="text-[var(--cn-primary)]" />;
      case 'quiz':
        return <IconHelp size={13} className="text-[var(--cn-accent)]" />;
      case 'article':
        return <IconFileText size={13} className="text-sky-400" />;
    }
  };

  // Overall course completion metrics
  const allLessons = course.sections.flatMap((s) => s.lessons);
  const totalCount = allLessons.length;
  const completedCount = allLessons.filter((l) => getLessonProgress(course.id, l.id)?.completed).length;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header Metric Bar */}
      <div className="p-5 rounded-2xl border border-[var(--cn-border)] bg-[var(--cn-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--cn-primary)]">
              Curriculum Roadmap
            </span>
            <span className="text-xs text-[var(--cn-text-muted)] font-mono">
              • {course.sections.length} Chapters • {totalCount} Units
            </span>
          </div>
          <p className="text-xs text-[var(--cn-text-secondary)]">
            Sequential progression path through course modules and verification checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono">
          <div className="text-right">
            <div className="text-sm font-bold text-[var(--cn-text-primary)]">
              {completedCount} of {totalCount} Completed
            </div>
            <div className="text-[11px] text-[var(--cn-text-muted)]">
              {overallPercent}% Syllabus Progress
            </div>
          </div>
          <div className="w-24">
            <ProgressBar value={overallPercent} size="md" tone={overallPercent === 100 ? 'success' : 'primary'} />
          </div>
        </div>
      </div>

      {/* Chapters & Module Accordion Hierarchy */}
      <div className="space-y-4">
        {course.sections.map((section: SectionData, sIdx: number) => {
          const isCollapsed = collapsedSections[section.id];
          const sectionLessons = section.lessons || [];
          const sectionCompleted = sectionLessons.filter((l) => getLessonProgress(course.id, l.id)?.completed).length;
          const sectionTotal = sectionLessons.length;
          const isSectionComplete = sectionTotal > 0 && sectionCompleted === sectionTotal;
          const hasActiveLesson = sectionLessons.some((l) => l.id === activeLessonId);

          return (
            <div
              key={section.id}
              className={clsx(
                'rounded-2xl border transition-all overflow-hidden',
                hasActiveLesson
                  ? 'border-[var(--cn-primary)]/50 bg-[var(--cn-surface)] shadow-md ring-1 ring-[var(--cn-primary)]/20'
                  : 'border-[var(--cn-border)] bg-[var(--cn-surface)]',
              )}
            >
              {/* Chapter Header Bar */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left bg-[var(--cn-surface-subtle)]/50 hover:bg-[var(--cn-surface-subtle)] transition-colors border-b border-[var(--cn-border)] select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 border',
                      isSectionComplete
                        ? 'bg-[var(--cn-success-tint)] text-[var(--cn-success)] border-[var(--cn-success)]/40'
                        : hasActiveLesson
                        ? 'bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] border-[var(--cn-primary)]/40'
                        : 'bg-[var(--cn-surface)] text-[var(--cn-text-muted)] border-[var(--cn-border)]',
                    )}
                  >
                    {isSectionComplete ? <IconCircleCheck size={14} /> : `0${sIdx + 1}`.slice(-2)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[var(--cn-text-primary)] truncate font-sans">
                        {section.title}
                      </h4>
                      {isSectionComplete && (
                        <StatusBadge tone="success" size="sm" label="Module Complete" showDot={true} />
                      )}
                    </div>
                    {section.description && (
                      <p className="text-xs text-[var(--cn-text-muted)] mt-0.5 line-clamp-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-[var(--cn-text-muted)] hidden sm:inline">
                    {sectionCompleted} / {sectionTotal} lessons
                  </span>
                  {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                </div>
              </button>

              {/* Sequential Lesson Nodes Track */}
              {!isCollapsed && (
                <div className="p-5 sm:p-6 space-y-0 relative">
                  {sectionLessons.map((lesson: LessonData, lIdx: number) => {
                    const prog = getLessonProgress(course.id, lesson.id);
                    const isLessonCompleted = prog?.completed ?? false;
                    const isActive = lesson.id === activeLessonId;
                    const quizRes = getQuizResult(lesson.id);
                    const isLastInModule = lIdx === sectionLessons.length - 1;
                    const contentType = lesson.blocks.some((b) => b.type === 'video') ? 'video' : lesson.quiz ? 'quiz' : 'article';

                    return (
                      <div key={lesson.id} className="relative flex items-start gap-4 pb-6 last:pb-2 group">
                        {/* Connecting Vertical Track Spine */}
                        {!isLastInModule && (
                          <span
                            aria-hidden="true"
                            className={clsx(
                              'absolute left-4 top-8 bottom-0 w-0.5 transition-colors',
                              isLessonCompleted ? 'bg-[var(--cn-primary)]/40' : 'bg-[var(--cn-border)]',
                            )}
                          />
                        )}

                        {/* Node Circle Indicator */}
                        <div
                          className={clsx(
                            'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all',
                            isLessonCompleted
                              ? 'border-[var(--cn-primary)] bg-[var(--cn-primary)] text-white shadow-sm'
                              : isActive
                              ? 'border-[var(--cn-primary)] bg-[var(--cn-bg)] text-[var(--cn-primary)] ring-4 ring-[var(--cn-primary-tint)]'
                              : 'border-[var(--cn-border)] bg-[var(--cn-bg)] text-[var(--cn-text-muted)] group-hover:border-[var(--cn-text-secondary)]',
                          )}
                        >
                          {isLessonCompleted ? (
                            <IconCircleCheck size={15} />
                          ) : isActive ? (
                            <IconPlayerPlay size={13} />
                          ) : (
                            <span className="text-[11px] font-mono font-medium">{lIdx + 1}</span>
                          )}
                        </div>

                        {/* Interactive Lesson Card */}
                        <Link
                          to={`/course/${course.id}/lesson/${lesson.id}`}
                          className={clsx(
                            'flex-1 min-w-0 rounded-xl border p-3.5 transition-all text-left block',
                            isActive
                              ? 'border-[var(--cn-primary)] bg-[var(--cn-primary-tint)]/40 shadow-xs'
                              : isLessonCompleted
                              ? 'border-[var(--cn-border)]/80 bg-[var(--cn-surface-subtle)]/30 hover:border-[var(--cn-border)] hover:bg-[var(--cn-surface-subtle)]/60'
                              : 'border-[var(--cn-border)] bg-[var(--cn-surface)] hover:border-[var(--cn-primary)]/40 hover:bg-[var(--cn-surface-subtle)]/40',
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-[var(--cn-text-primary)] group-hover:text-[var(--cn-primary)] transition-colors">
                                  {lesson.title}
                                </span>
                                {isActive && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[var(--cn-primary)] text-white">
                                    Current
                                  </span>
                                )}
                              </div>
                              {lesson.description && (
                                <p className="text-[11px] text-[var(--cn-text-muted)] line-clamp-1">
                                  {lesson.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 text-[11px] font-mono text-[var(--cn-text-secondary)]">
                              <div className="flex items-center gap-1">
                                {getContentTypeIcon(contentType)}
                                <span className="capitalize">{contentType}</span>
                              </div>

                              {lesson.estimatedDurationMinutes && (
                                <div className="flex items-center gap-1 text-[var(--cn-text-muted)]">
                                  <IconClock size={11} />
                                  <span>{lesson.estimatedDurationMinutes}m</span>
                                </div>
                              )}

                              {quizRes && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--cn-accent-tint)] text-[var(--cn-accent)] font-semibold border border-[var(--cn-accent)]/30">
                                  Score: {quizRes.score}%
                                </span>
                              )}

                              <IconChevronRight size={13} className="text-[var(--cn-text-muted)] group-hover:text-[var(--cn-text-primary)] group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
