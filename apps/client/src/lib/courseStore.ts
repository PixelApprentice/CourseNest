import { useState } from 'react';
import { DownloadStatus } from '@coursenest/domain';
import { DEMO_COURSES, type FixtureCourseData } from '../fixtures/courses';

const STORAGE_KEY = 'coursenest-courses-v1';
const PROGRESS_KEY = 'coursenest-progress-v1';
const NOTES_KEY = 'coursenest-notes-v1';
const PLAYBACK_KEY = 'coursenest-playback-v1';

export interface LessonProgressState {
  completed: boolean;
  timeSpentSeconds: number;
  lastAccessed: string;
}

export function getStoredCourses(): FixtureCourseData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load stored courses:', e);
  }
  // Default to demo courses
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_COURSES));
  return DEMO_COURSES;
}

export function saveCourses(courses: FixtureCourseData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch (e) {
    console.error('Failed to save courses:', e);
  }
}

export function getLessonProgress(courseId: string, lessonId: string): LessonProgressState | null {
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY}:${courseId}:${lessonId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLessonProgress(courseId: string, lessonId: string, progress: Partial<LessonProgressState>): void {
  try {
    const key = `${PROGRESS_KEY}:${courseId}:${lessonId}`;
    const current = getLessonProgress(courseId, lessonId) ?? {
      completed: false,
      timeSpentSeconds: 0,
      lastAccessed: new Date().toISOString(),
    };
    const updated = { ...current, ...progress, lastAccessed: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to set lesson progress:', e);
  }
}

export function getSavedPlaybackTime(lessonId: string): number {
  try {
    const raw = localStorage.getItem(`${PLAYBACK_KEY}:${lessonId}`);
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

export function savePlaybackTime(lessonId: string, time: number): void {
  try {
    localStorage.setItem(`${PLAYBACK_KEY}:${lessonId}`, time.toString());
  } catch (e) {
    console.error('Failed to save playback time:', e);
  }
}

export function getLessonNotes(lessonId: string): string {
  return localStorage.getItem(`${NOTES_KEY}:${lessonId}`) ?? '';
}

export function saveLessonNotes(lessonId: string, notes: string): void {
  localStorage.setItem(`${NOTES_KEY}:${lessonId}`, notes);
}

export function removeDownloadedCourseBytes(courseId: string): void {
  const courses = getStoredCourses();
  const updated = courses.map((item) => {
    if (item.course.id === courseId) {
      return {
        ...item,
        course: {
          ...item.course,
          localAvailability: DownloadStatus.NotDownloaded,
        },
      };
    }
    return item;
  });
  saveCourses(updated);
  // Note: We deliberately DO NOT delete progress or notes keys, preserving learning records!
}

export function useCourses() {
  const [courses, setCourses] = useState<FixtureCourseData[]>(getStoredCourses);

  const refresh = () => setCourses(getStoredCourses());

  return { courses, refresh };
}
