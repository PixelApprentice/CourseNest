import type { Course, Section, Lesson, ContentBlock, Activity } from '@coursenest/domain';

export interface FixtureCourseData {
  course: Course;
  sections: Array<{
    section: Section;
    lessons: Array<{
      lesson: Lesson;
      blocks: ContentBlock[];
      activity?: Activity;
    }>;
  }>;
}

// Clean vault default: Zero hardcoded mock courses
export const DEMO_COURSES: FixtureCourseData[] = [];
