/**
 * CourseNest Flashcard & Active Recall Vault
 * Persists flashcards locally in localStorage under coursenest_flashcards_v1.
 * Supports spaced repetition review ratings, lesson/course filtering, and Anki/JSON export.
 */

export interface Flashcard {
  id: string;
  courseId: string;
  lessonId: string;
  question: string;
  answer: string;
  topic?: string;
  hint?: string;
  citation?: string; // e.g. "[02:15]" or "[Slide 4]"
  createdAt: number;
  lastReviewedAt?: number;
  reviewCount: number;
  intervalDays: number;
  easeFactor: number; // default 2.5
}

const FLASHCARDS_STORAGE_KEY = 'coursenest_flashcards_v1';

export function getFlashcards(courseId?: string, lessonId?: string): Flashcard[] {
  try {
    const raw = localStorage.getItem(FLASHCARDS_STORAGE_KEY);
    if (!raw) return [];
    const list: Flashcard[] = JSON.parse(raw);
    if (lessonId) {
      return list.filter((c) => c.lessonId === lessonId);
    }
    if (courseId) {
      return list.filter((c) => c.courseId === courseId);
    }
    return list;
  } catch (err) {
    console.warn('Failed to load flashcards:', err);
    return [];
  }
}

export function saveFlashcard(card: Omit<Flashcard, 'id' | 'createdAt' | 'reviewCount' | 'intervalDays' | 'easeFactor'> & { id?: string }): Flashcard {
  const all = getFlashcards();
  const id = card.id || `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const existingIndex = all.findIndex((c) => c.id === id);

  const fullCard: Flashcard = {
    id,
    courseId: card.courseId,
    lessonId: card.lessonId,
    question: card.question.trim(),
    answer: card.answer.trim(),
    topic: card.topic?.trim() || undefined,
    hint: card.hint?.trim() || undefined,
    citation: card.citation?.trim() || undefined,
    createdAt: Date.now(),
    reviewCount: existingIndex >= 0 ? all[existingIndex]!.reviewCount : 0,
    intervalDays: existingIndex >= 0 ? all[existingIndex]!.intervalDays : 1,
    easeFactor: existingIndex >= 0 ? all[existingIndex]!.easeFactor : 2.5,
  };

  if (existingIndex >= 0) {
    all[existingIndex] = fullCard;
  } else {
    all.unshift(fullCard);
  }

  try {
    localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('coursenest_flashcards_changed'));
  } catch (e) {
    console.error('Failed to save flashcard to storage:', e);
  }

  return fullCard;
}

export function deleteFlashcard(id: string): void {
  const all = getFlashcards().filter((c) => c.id !== id);
  try {
    localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('coursenest_flashcards_changed'));
  } catch (e) {
    console.error('Failed to delete flashcard:', e);
  }
}

export function recordFlashcardReview(id: string, quality: 'easy' | 'good' | 'hard'): void {
  const all = getFlashcards();
  const card = all.find((c) => c.id === id);
  if (!card) return;

  card.lastReviewedAt = Date.now();
  card.reviewCount += 1;

  // Lightweight SuperMemo-2 / Leitner hybrid
  if (quality === 'hard') {
    card.intervalDays = 1;
    card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
  } else if (quality === 'good') {
    card.intervalDays = card.intervalDays === 1 ? 3 : Math.round(card.intervalDays * 1.5);
  } else if (quality === 'easy') {
    card.intervalDays = card.intervalDays === 1 ? 5 : Math.round(card.intervalDays * card.easeFactor);
    card.easeFactor += 0.15;
  }

  try {
    localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('coursenest_flashcards_changed'));
  } catch (e) {
    console.error('Failed to record flashcard review:', e);
  }
}

export function exportFlashcardsAsJson(courseId?: string): string {
  const cards = getFlashcards(courseId);
  return JSON.stringify(cards, null, 2);
}

export function exportFlashcardsAsAnkiCsv(courseId?: string): string {
  const cards = getFlashcards(courseId);
  const rows = cards.map((c) => {
    const q = `"${c.question.replace(/"/g, '""')}"`;
    const a = `"${c.answer.replace(/"/g, '""')}"`;
    const topic = `"${(c.topic || '').replace(/"/g, '""')}"`;
    return `${q}\t${a}\t${topic}`;
  });
  return rows.join('\n');
}
