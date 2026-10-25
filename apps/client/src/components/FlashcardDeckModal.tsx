import { useState, useEffect } from 'react';
import { 
  IconCards, 
  IconX, 
  IconChevronLeft, 
  IconChevronRight, 
  IconRotate, 
  IconPlus, 
  IconTrash, 
  IconDownload,
  IconBulb,
  IconPlayerPlay
} from '@tabler/icons-react';
import { 
  getFlashcards, 
  recordFlashcardReview, 
  deleteFlashcard, 
  saveFlashcard, 
  exportFlashcardsAsAnkiCsv,
  type Flashcard 
} from '../lib/flashcardStore';
import { timestampToSeconds } from '../lib/formatHelpers';
import clsx from 'clsx';

export interface FlashcardDeckModalProps {
  courseId: string;
  lessonId: string;
  courseTitle?: string;
  lessonTitle?: string;
  onClose: () => void;
  onSeekTo?: (seconds: number) => void;
}

export function FlashcardDeckModal({
  courseId,
  lessonId,
  courseTitle,
  lessonTitle,
  onClose,
  onSeekTo,
}: FlashcardDeckModalProps) {
  const [filterScope, setFilterScope] = useState<'lesson' | 'course'>('lesson');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const loadCards = () => {
    const list = getFlashcards(
      courseId,
      filterScope === 'lesson' ? lessonId : undefined
    );
    setCards(list);
    if (currentIndex >= list.length) {
      setCurrentIndex(Math.max(0, list.length - 1));
    }
    setIsFlipped(false);
    setShowHint(false);
  };

  useEffect(() => {
    loadCards();
    const handleCardsChanged = () => loadCards();
    window.addEventListener('coursenest_flashcards_changed', handleCardsChanged);
    return () => window.removeEventListener('coursenest_flashcards_changed', handleCardsChanged);
  }, [filterScope, courseId, lessonId]);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handleRating = (quality: 'easy' | 'good' | 'hard') => {
    if (!currentCard) return;
    recordFlashcardReview(currentCard.id, quality);
    handleNext();
  };

  const handleDelete = (id: string) => {
    deleteFlashcard(id);
    loadCards();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    saveFlashcard({
      courseId,
      lessonId,
      question: newQuestion,
      answer: newAnswer,
      topic: newTopic.trim() || lessonTitle,
    });

    setNewQuestion('');
    setNewAnswer('');
    setNewTopic('');
    setIsCreating(false);
    loadCards();
  };

  const handleExportAnki = () => {
    const csv = exportFlashcardsAsAnkiCsv(courseId);
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coursenest-${courseId}-anki.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--cn-border)] bg-[var(--cn-surface-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center">
              <IconCards size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--cn-text-primary)]">
                Active Recall Flashcards
              </h2>
              <p className="text-[11px] text-[var(--cn-text-muted)] font-mono">
                {filterScope === 'lesson' ? (lessonTitle || 'This Lesson') : (courseTitle || 'Entire Course')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scope Filter */}
            <div className="flex items-center bg-[var(--cn-bg)] rounded-lg p-0.5 border border-[var(--cn-border)] text-xs font-mono">
              <button
                type="button"
                onClick={() => setFilterScope('lesson')}
                className={clsx(
                  'px-2.5 py-1 rounded-md transition-colors',
                  filterScope === 'lesson'
                    ? 'bg-[var(--cn-primary)] text-white font-bold'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                )}
              >
                Lesson
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('course')}
                className={clsx(
                  'px-2.5 py-1 rounded-md transition-colors',
                  filterScope === 'course'
                    ? 'bg-[var(--cn-primary)] text-white font-bold'
                    : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)]'
                )}
              >
                All Course
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--cn-text-muted)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-bg)] transition-colors"
              title="Close Deck"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
          {cards.length === 0 ? (
            <div className="text-center py-12 space-y-4 my-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] flex items-center justify-center">
                <IconCards size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--cn-text-primary)]">
                  No flashcards in this deck yet
                </h3>
                <p className="text-xs text-[var(--cn-text-muted)] max-w-sm mx-auto">
                  Ask the AI Study Companion to generate active-recall questions, or create your own custom study cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--cn-primary)] text-white font-bold text-xs shadow-sm hover:opacity-95 transition-transform active:scale-95"
              >
                <IconPlus size={14} />
                <span>Create First Card</span>
              </button>
            </div>
          ) : isCreating ? (
            <form onSubmit={handleCreate} className="space-y-4 my-auto">
              <h3 className="text-sm font-bold text-[var(--cn-text-primary)]">New Flashcard</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[var(--cn-text-muted)]">Front (Question / Prompt)</label>
                <textarea
                  required
                  rows={3}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. What is the access latency of L1 CPU cache?"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--cn-bg)] border border-[var(--cn-border)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[var(--cn-text-muted)]">Back (Answer / Explanation)</label>
                <textarea
                  required
                  rows={3}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="e.g. ~0.5 to 1 ns (approx 4 clock cycles)."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--cn-bg)] border border-[var(--cn-border)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[var(--cn-text-muted)]">Topic / Category Tag (Optional)</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder={lessonTitle || 'Hardware Architecture'}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--cn-bg)] border border-[var(--cn-border)] text-xs text-[var(--cn-text-primary)] focus:outline-none focus:border-[var(--cn-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--cn-border)] text-xs text-[var(--cn-text-secondary)] hover:bg-[var(--cn-surface-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[var(--cn-primary)] text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Save Card
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 my-auto">
              {/* Card Meta Rail */}
              <div className="flex items-center justify-between text-xs font-mono text-[var(--cn-text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--cn-text-primary)]">
                    Card {currentIndex + 1} of {cards.length}
                  </span>
                  {currentCard?.topic && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--cn-surface-subtle)] border border-[var(--cn-border)] text-[10px]">
                      {currentCard.topic}
                    </span>
                  )}
                  {currentCard?.citation && (
                    <button
                      type="button"
                      onClick={() => {
                        const sec = timestampToSeconds(currentCard.citation!.replace(/[\[\]]/g, ''));
                        if (sec >= 0 && onSeekTo) onSeekTo(sec);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--cn-primary-tint)] text-[var(--cn-primary)] text-[10px] font-bold hover:underline"
                    >
                      <IconPlayerPlay size={9} />
                      <span>{currentCard.citation}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(currentCard!.id)}
                    className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete Card"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              {/* Interactive 3D Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[220px] rounded-2xl border-2 border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/70 p-6 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 hover:border-[var(--cn-primary)]/50 shadow-sm relative group"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--cn-text-muted)]">
                  <span className="uppercase tracking-wider font-bold text-[var(--cn-primary)]">
                    {isFlipped ? 'Answer (Back)' : 'Question (Front)'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] group-hover:text-[var(--cn-primary)] transition-colors">
                    <IconRotate size={12} />
                    <span>Click to Flip</span>
                  </span>
                </div>

                <div className="py-4 text-center">
                  <p className="text-sm md:text-base font-medium text-[var(--cn-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {isFlipped ? currentCard?.answer : currentCard?.question}
                  </p>
                </div>

                {/* Optional Hint */}
                {currentCard?.hint && !isFlipped && (
                  <div className="pt-2 border-t border-[var(--cn-border)] text-left">
                    {showHint ? (
                      <p className="text-[11px] text-[var(--cn-text-secondary)] italic flex items-center gap-1.5">
                        <IconBulb size={13} className="text-amber-500 shrink-0" />
                        <span>Hint: {currentCard.hint}</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--cn-text-muted)] hover:text-amber-500"
                      >
                        <IconBulb size={12} />
                        <span>Show Hint</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="text-[10px] font-mono text-[var(--cn-text-muted)] text-right">
                  {currentCard?.reviewCount ? `Reviewed ${currentCard.reviewCount} times` : 'New card'}
                </div>
              </div>

              {/* Review Buttons / Navigation */}
              {isFlipped ? (
                <div className="space-y-2 pt-1">
                  <div className="text-center text-[11px] font-mono text-[var(--cn-text-muted)]">
                    How well did you recall this answer?
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRating('hard')}
                      className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold text-xs hover:bg-red-500/20 active:scale-95 transition-transform"
                    >
                      Hard (1d)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRating('good')}
                      className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 font-bold text-xs hover:bg-blue-500/20 active:scale-95 transition-transform"
                    >
                      Good (3d)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRating('easy')}
                      className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs hover:bg-emerald-500/20 active:scale-95 transition-transform"
                    >
                      Easy (5d)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--cn-border)] text-xs text-[var(--cn-text-secondary)] disabled:opacity-40 hover:bg-[var(--cn-surface-subtle)] active:scale-95 transition-transform"
                  >
                    <IconChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="px-4 py-1.5 rounded-xl bg-[var(--cn-primary)] text-white font-bold text-xs shadow-xs hover:opacity-95 active:scale-95 transition-transform"
                  >
                    Flip Card (Space)
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIndex === cards.length - 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--cn-border)] text-xs text-[var(--cn-text-secondary)] disabled:opacity-40 hover:bg-[var(--cn-surface-subtle)] active:scale-95 transition-transform"
                  >
                    <span>Next</span>
                    <IconChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[var(--cn-border)] bg-[var(--cn-surface-subtle)]/50 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] transition-colors"
            >
              <IconPlus size={13} />
              <span>Add Card</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAnki}
              disabled={cards.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--cn-border)] text-[var(--cn-text-secondary)] hover:text-[var(--cn-text-primary)] hover:bg-[var(--cn-surface)] disabled:opacity-40 transition-colors"
              title="Export as Anki TSV format"
            >
              <IconDownload size={13} />
              <span>Export Anki</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
