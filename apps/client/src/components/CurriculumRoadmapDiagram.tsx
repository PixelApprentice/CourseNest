import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Play, 
  Clock, 
  Video, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown
} from 'lucide-react';
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

  const allLessons = course.sections.flatMap((s) => s.lessons);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => getLessonProgress(course.id, l.id)?.completed).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const toggleSection = (secId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={13} className="text-[var(--cn-primary)]" />;
      case 'article':
      case 'pdf':
      case 'document':
        return <FileText size={13} className="text-sky-400" />;
      case 'quiz':
        return <HelpCircle size={13} className="text-[var(--cn-accent)]" />;
      default:
        return <FileText size={13} className="text-[var(--cn-text-muted)]" />;
    }
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Roadmap Mastery Analytics Banner */}
      <div className="rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--cn-text-muted)]">
                Interactive Learning Roadmap
              </span>
              {overallPercent === 100 ? (
                <StatusBadge tone="success" label="Curriculum Mastered" showDot={true} />
              ) : overallPercent > 0 ? (
                <StatusBadge tone="info" label="In Progress" pulsing={true} />
              ) : (
                <StatusBadge tone="neutral" label="Not Started" showDot={false} />
              )}
            </div>
            <h3 className="text-lg font-bold text-[var(--cn-text-primary)]">
              {course.title} Progress Path
            </h3>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-2 rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] text-center min-w-24">
              <p className="text-[10px] font-mono text-[var(--cn-text-muted)] uppercase">Milestones</p>
              <p className="text-sm font-mono font-bold text-[var(--cn-text-primary)]">
                {completedLessons} / {totalLessons}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] text-center min-w-24">
              <p className="text-[10px] font-mono text-[var(--cn-text-muted)] uppercase">Mastery</p>
              <p className="text-sm font-mono font-bold text-[var(--cn-primary)]">
                {overallPercent}%
              </p>
            </div>
          </div>
        </div>

        <ProgressBar value={overallPercent} size="md" tone="primary" />
      </div>

      {/* Connected Modular Workflow Pipeline */}
      <div className="space-y-6 relative">
        {course.sections.map((section: SectionData, sIdx: number) => {
          const isCollapsed = collapsedSections[section.id];
          const sectionLessons = section.lessons;
          const sectionCompleted = sectionLessons.filter((l) => getLessonProgress(course.id, l.id)?.completed).length;
          const sectionTotal = sectionLessons.length;
          const isSectionComplete = sectionTotal > 0 && sectionCompleted === sectionTotal;

          return (
            <div
              key={section.id}
              className="rounded-xl border border-[var(--cn-border)] bg-[var(--cn-surface)] overflow-hidden transition-all"
            >
              {/* Module Node Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center justify-between bg-[var(--cn-surface-subtle)]/60 hover:bg-[var(--cn-surface-subtle)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--cn-bg)] border border-[var(--cn-border)] text-xs font-mono font-bold text-[var(--cn-text-secondary)]">
                    {sIdx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[var(--cn-text-primary)]">
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
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
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
                            <CheckCircle2 size={15} />
                          ) : isActive ? (
                            <Play size={13} fill="currentColor" />
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
                                  <Clock size={11} />
                                  <span>{lesson.estimatedDurationMinutes}m</span>
                                </div>
                              )}

                              {quizRes && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--cn-accent-tint)] text-[var(--cn-accent)] font-semibold border border-[var(--cn-accent)]/30">
                                  Score: {quizRes.score}%
                                </span>
                              )}

                              <ChevronRight size={13} className="text-[var(--cn-text-muted)] group-hover:text-[var(--cn-text-primary)] group-hover:translate-x-0.5 transition-all" />
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
