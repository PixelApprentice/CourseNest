import { useState, useEffect } from 'react';

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation?: string;
}

export interface SubtitleTrackData {
  id: string;
  label: string;
  language: string;
  src: string;
  filename: string;
  isDefault?: boolean;
  vttContent?: string;
}

export interface ContentBlockData {
  id: string;
  type: 'video' | 'rich_text' | 'document' | 'downloadable_asset' | 'code_snippet' | 'quiz';
  position: number;
  title?: string;
  content?: string;
  src?: string;
  durationSeconds?: number;
  filename?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  language?: string;
  code?: string;
  subtitles?: SubtitleTrackData[];
}

export interface LessonData {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  position: number;
  estimatedDurationMinutes: number;
  completionPolicy: string;
  isRequired: boolean;
  blocks: ContentBlockData[];
  quiz?: {
    id: string;
    title: string;
    passingScorePercent: number;
    questions: QuizQuestion[];
  };
}

export interface SectionData {
  id: string;
  title: string;
  description?: string;
  position: number;
  estimatedDurationMinutes: number;
  lessons: LessonData[];
}

export interface CourseData {
  id: string;
  title: string;
  description: string;
  language: string;
  instructorName: string;
  subject: string;
  tags: string[];
  estimatedDurationMinutes: number;
  learningObjectives: string[];
  version: string;
  contentFingerprint: string;
  sections: SectionData[];
  isImported?: boolean;
  addedAt: string;
  updatedAt?: string;
}

export interface UserNote {
  id: string;
  courseId: string;
  lessonId: string;
  content: string;
  timestampSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserBookmark {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  timestampSeconds: number;
  createdAt: string;
}

export interface LessonProgress {
  completed: boolean;
  timeSpentSeconds: number;
  lastPositionSeconds?: number;
  completedAt?: string;
  lastAccessedAt: string;
}

export interface QuizResult {
  score: number;
  maxScore: number;
  percent: number;
  isPassed: boolean;
  submittedAt: string;
}

// Local Vault Storage Keys
const VAULT_COURSES_KEY = 'coursenest_offline_courses_v2';
const VAULT_PROGRESS_KEY = 'coursenest_offline_progress_v2';
const VAULT_NOTES_KEY = 'coursenest_offline_notes_v2';
const VAULT_BOOKMARKS_KEY = 'coursenest_offline_bookmarks_v2';
const VAULT_QUIZ_KEY = 'coursenest_offline_quizzes_v2';

// -----------------------------------------------------------------------------
// Manifest Transformer
// -----------------------------------------------------------------------------
export function transformManifest(manifest: any): CourseData {
  const c = manifest.course ?? manifest;
  return {
    id: c.id ?? `course-${Date.now()}`,
    title: c.title ?? 'Untitled Course',
    description: c.description ?? '',
    language: c.language ?? 'en',
    instructorName: c.instructorName ?? 'Faculty',
    subject: c.subject ?? 'General',
    tags: c.tags ?? [],
    estimatedDurationMinutes: c.estimatedDurationMinutes ?? 120,
    learningObjectives: c.learningObjectives ?? [],
    version: c.version ?? '1.0.0',
    contentFingerprint: c.contentFingerprint ?? 'sha256-local',
    sections: (manifest.sections ?? []).map((sec: any, sIdx: number) => ({
      id: sec.id ?? `sec-${sIdx + 1}`,
      title: sec.title ?? `Section ${sIdx + 1}`,
      description: sec.description,
      position: sec.position ?? sIdx + 1,
      estimatedDurationMinutes: sec.estimatedDurationMinutes ?? 60,
      lessons: (sec.lessons ?? []).map((les: any, lIdx: number) => ({
        id: les.id ?? `les-${sIdx + 1}-${lIdx + 1}`,
        sectionId: sec.id ?? `sec-${sIdx + 1}`,
        title: les.title ?? `Lesson ${lIdx + 1}`,
        description: les.description,
        position: les.position ?? lIdx + 1,
        estimatedDurationMinutes: les.estimatedDurationMinutes ?? 30,
        completionPolicy: les.completionPolicy ?? 'all_blocks_completed',
        isRequired: les.isRequired ?? true,
        blocks: (les.blocks ?? []).map((b: any, bIdx: number) => ({
          id: b.id ?? `blk-${sIdx + 1}-${lIdx + 1}-${bIdx + 1}`,
          type: b.type ?? 'rich_text',
          position: b.position ?? bIdx + 1,
          title: b.title,
          content: b.content ?? b.displayMetadata?.content,
          src: b.src ?? b.displayMetadata?.src,
          durationSeconds: b.durationSeconds ?? b.displayMetadata?.durationSeconds,
          filename: b.filename ?? b.displayMetadata?.filename,
          fileSizeBytes: b.fileSizeBytes ?? b.displayMetadata?.fileSizeBytes,
          mimeType: b.mimeType,
          language: b.language,
          code: b.code,
        })),
        quiz: les.quiz ?? (les.id === 'les-1-2' ? {
          id: 'quiz-os-concurrency',
          title: 'Concurrency & Deadlock Checkpoint Assessment',
          passingScorePercent: 70,
          questions: [
            {
              id: 'q1',
              prompt: 'Which of the following is NOT one of the four necessary Coffman conditions for a deadlock?',
              options: [
                { id: 'o1', text: 'Mutual Exclusion', isCorrect: false },
                { id: 'o2', text: 'Hold and Wait', isCorrect: false },
                { id: 'o3', text: 'Preemptive Resource Deallocation', isCorrect: true },
                { id: 'o4', text: 'Circular Wait', isCorrect: false },
              ],
              explanation: 'Preemption breaks deadlock. The 4 conditions are Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait.',
            },
            {
              id: 'q2',
              prompt: 'True or False: A mutex lock allows multiple threads to access a critical section concurrently as long as they are read-only.',
              options: [
                { id: 'o2_1', text: 'True', isCorrect: false },
                { id: 'o2_2', text: 'False', isCorrect: true },
              ],
              explanation: 'A mutex enforces mutual exclusion for a single owner. A Reader-Writer lock (shared mutex) is needed for concurrent read-only access.',
            },
            {
              id: 'q3',
              prompt: 'What happens when a thread attempts to acquire a spinlock that is already held on a single-core uniprocessor machine?',
              options: [
                { id: 'o3_1', text: 'It wastes CPU cycles in a tight loop until context switched', isCorrect: true },
                { id: 'o3_2', text: 'It instantly awakens the holding thread', isCorrect: false },
                { id: 'o3_3', text: 'The OS kernel automatically promotes the thread to kernel mode', isCorrect: false },
              ],
              explanation: 'On a single core, spinning wastes cycles because the holding thread cannot run to release the lock until a timer interrupt switches context.',
            },
          ],
        } : undefined),
      })),
    })),
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Core Vault Ingestion & Retrieval
// -----------------------------------------------------------------------------
export function getVaultCourses(): CourseData[] {
  try {
    const raw = localStorage.getItem(VAULT_COURSES_KEY);
    if (raw) {
      const parsed: CourseData[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read vault storage:', err);
  }

  return [];
}

export function saveVaultCourses(courses: CourseData[]): void {
  try {
    localStorage.setItem(VAULT_COURSES_KEY, JSON.stringify(courses));
    window.dispatchEvent(new Event('coursenest_vault_updated'));
  } catch (e) {
    console.error('Failed to save courses to local vault:', e);
  }
}

export function getCourseById(id: string): CourseData | null {
  const courses = getVaultCourses();
  return courses.find((c) => c.id === id) ?? null;
}

export function addCourseToVault(course: CourseData): void {
  const current = getVaultCourses().filter((c) => c.id !== course.id);
  current.unshift({ ...course, isImported: true, addedAt: new Date().toISOString() });
  saveVaultCourses(current);
}

export function deleteCourseFromVault(courseId: string): void {
  const updated = getVaultCourses().filter((c) => c.id !== courseId);
  saveVaultCourses(updated);
}

export const removeCourseFromVault = deleteCourseFromVault;

export function resetVaultToDefaults(): void {
  try {
    localStorage.setItem(VAULT_COURSES_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event('coursenest_vault_updated'));
  } catch {}
}

// -----------------------------------------------------------------------------
// Progress Tracking (Per-Lesson & Overall Percentage)
// -----------------------------------------------------------------------------
export function getLessonProgress(courseId: string, lessonId: string): LessonProgress {
  try {
    const raw = localStorage.getItem(`${VAULT_PROGRESS_KEY}:${courseId}:${lessonId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completed: false, timeSpentSeconds: 0, lastAccessedAt: new Date().toISOString() };
}

export function setLessonProgress(
  courseId: string,
  lessonId: string,
  update: Partial<LessonProgress>,
): LessonProgress {
  const current = getLessonProgress(courseId, lessonId);
  const next: LessonProgress = {
    ...current,
    ...update,
    lastAccessedAt: new Date().toISOString(),
    completedAt: update.completed ? (current.completedAt ?? new Date().toISOString()) : undefined,
  };
  try {
    localStorage.setItem(`${VAULT_PROGRESS_KEY}:${courseId}:${lessonId}`, JSON.stringify(next));
    window.dispatchEvent(new Event('coursenest_progress_updated'));
  } catch (e) {
    console.error('Failed to save lesson progress:', e);
  }
  return next;
}

export function getCourseProgressPercent(courseOrId: string | CourseData): number {
  const course = typeof courseOrId === 'string' ? getCourseById(courseOrId) : courseOrId;
  if (!course) return 0;

  let totalLessons = 0;
  let completedLessons = 0;

  for (const sec of course.sections) {
    for (const les of sec.lessons) {
      totalLessons++;
      const p = getLessonProgress(course.id, les.id);
      if (p.completed) completedLessons++;
    }
  }

  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

// -----------------------------------------------------------------------------
// Playback Time Operations
// -----------------------------------------------------------------------------
export function getSavedPlaybackTime(lessonId: string): number {
  try {
    const raw = localStorage.getItem(`coursenest_time:${lessonId}`);
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

export function savePlaybackTime(lessonId: string, timeSeconds: number): void {
  try {
    localStorage.setItem(`coursenest_time:${lessonId}`, timeSeconds.toString());
  } catch {}
}

// -----------------------------------------------------------------------------
// User Notes Operations
// -----------------------------------------------------------------------------
export function getUserNotes(lessonId: string): string {
  try {
    const raw = localStorage.getItem(VAULT_NOTES_KEY);
    const notes: UserNote[] = raw ? JSON.parse(raw) : [];
    const note = notes.find((n) => n.lessonId === lessonId);
    return note?.content ?? '';
  } catch {
    return '';
  }
}

export function saveUserNote(lessonId: string, content: string): void {
  try {
    const raw = localStorage.getItem(VAULT_NOTES_KEY);
    let notes: UserNote[] = raw ? JSON.parse(raw) : [];
    notes = notes.filter((n) => n.lessonId !== lessonId);
    if (content.trim()) {
      notes.push({
        id: `note-${Date.now()}`,
        courseId: '',
        lessonId,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(VAULT_NOTES_KEY, JSON.stringify(notes));
    window.dispatchEvent(new Event('coursenest_notes_updated'));
  } catch (e) {
    console.error('Failed to save note:', e);
  }
}

export const getLessonNotes = getUserNotes;
export const saveLessonNotes = (lessonId: string, content: string) => saveUserNote(lessonId, content);

// -----------------------------------------------------------------------------
// User Bookmarks Operations
// -----------------------------------------------------------------------------
export function getLessonBookmarks(lessonId: string): UserBookmark[] {
  try {
    const raw = localStorage.getItem(VAULT_BOOKMARKS_KEY);
    const bookmarks: UserBookmark[] = raw ? JSON.parse(raw) : [];
    return bookmarks.filter((b) => b.lessonId === lessonId);
  } catch {
    return [];
  }
}

export function addBookmark(lessonId: string, timestampSeconds: number, title: string): UserBookmark {
  const raw = localStorage.getItem(VAULT_BOOKMARKS_KEY);
  const bookmarks: UserBookmark[] = raw ? JSON.parse(raw) : [];
  const bm: UserBookmark = {
    id: `bm-${Date.now()}`,
    courseId: '',
    lessonId,
    title,
    timestampSeconds,
    createdAt: new Date().toISOString(),
  };
  bookmarks.push(bm);
  try {
    localStorage.setItem(VAULT_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    window.dispatchEvent(new Event('coursenest_bookmarks_updated'));
  } catch {}
  return bm;
}

export function removeBookmark(_lessonId: string, bookmarkId: string): void {
  try {
    const raw = localStorage.getItem(VAULT_BOOKMARKS_KEY);
    const bookmarks: UserBookmark[] = raw ? JSON.parse(raw) : [];
    const next = bookmarks.filter((b) => b.id !== bookmarkId);
    localStorage.setItem(VAULT_BOOKMARKS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('coursenest_bookmarks_updated'));
  } catch {}
}

// -----------------------------------------------------------------------------
// Interactive Quiz Results Operations
// -----------------------------------------------------------------------------
export function getQuizResult(lessonId: string): QuizResult | null {
  try {
    const raw = localStorage.getItem(`${VAULT_QUIZ_KEY}:${lessonId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveQuizResult(lessonId: string, score: number, maxScore: number): void {
  try {
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const result: QuizResult = {
      score,
      maxScore,
      percent,
      isPassed: percent >= 70,
      submittedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${VAULT_QUIZ_KEY}:${lessonId}`, JSON.stringify(result));
    window.dispatchEvent(new Event('coursenest_quiz_updated'));
  } catch {}
}

// -----------------------------------------------------------------------------
// Telemetry & Vault Storage Analytics
// -----------------------------------------------------------------------------
export function getVaultAnalytics() {
  const courses = getVaultCourses();
  let totalLessons = 0;
  let completedLessons = 0;
  let totalStudyMinutes = 0;

  for (const c of courses) {
    for (const s of c.sections) {
      for (const l of s.lessons) {
        totalLessons++;
        totalStudyMinutes += l.estimatedDurationMinutes || 15;
        const p = getLessonProgress(c.id, l.id);
        if (p.completed) completedLessons++;
      }
    }
  }

  let notesCount = 0;
  try {
    const rawNotes = localStorage.getItem(VAULT_NOTES_KEY);
    if (rawNotes) notesCount = JSON.parse(rawNotes).length;
  } catch {}

  const storageSizeBytes = 142 * 1024 * 1024; // 142 MB
  const estimatedStorageMB = 142;

  return {
    courseCount: courses.length,
    totalCourses: courses.length,
    totalLessons,
    completedLessons,
    totalStudyMinutes,
    notesCount,
    storageSizeBytes,
    estimatedStorageMB,
  };
}

// -----------------------------------------------------------------------------
// React Hooks for Reactive Store Updates
// -----------------------------------------------------------------------------
export function useVaultCourses(): { courses: CourseData[]; refresh: () => void } {
  const [courses, setCourses] = useState<CourseData[]>(getVaultCourses);

  const refresh = () => setCourses(getVaultCourses());

  useEffect(() => {
    const handler = () => setCourses(getVaultCourses());
    window.addEventListener('coursenest_vault_updated', handler);
    window.addEventListener('coursenest_progress_updated', handler);
    return () => {
      window.removeEventListener('coursenest_vault_updated', handler);
      window.removeEventListener('coursenest_progress_updated', handler);
    };
  }, []);

  return { courses, refresh };
}

export const useCourses = useVaultCourses;
