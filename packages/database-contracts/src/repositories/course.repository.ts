import type { Course, CourseVersion, Section, Lesson, ContentBlock } from '@coursenest/domain';
import type { CourseId, CourseVersionId, SectionId, LessonId, ContentBlockId } from '@coursenest/domain';

export interface ICourseRepository {
  findById(id: CourseId): Promise<Course | null>;
  findAll(options?: { limit?: number; offset?: number; search?: string }): Promise<Course[]>;
  create(course: Course): Promise<Course>;
  update(id: CourseId, updates: Partial<Course>): Promise<Course>;
  delete(id: CourseId): Promise<void>;
  count(options?: { search?: string }): Promise<number>;
}

export interface ICourseVersionRepository {
  findById(id: CourseVersionId): Promise<CourseVersion | null>;
  findByCourse(courseId: CourseId): Promise<CourseVersion[]>;
  create(version: CourseVersion): Promise<CourseVersion>;
  update(id: CourseVersionId, updates: Partial<CourseVersion>): Promise<CourseVersion>;
}

export interface ISectionRepository {
  findById(id: SectionId): Promise<Section | null>;
  findByCourseVersion(courseVersionId: CourseVersionId): Promise<Section[]>;
  create(section: Section): Promise<Section>;
  update(id: SectionId, updates: Partial<Section>): Promise<Section>;
  delete(id: SectionId): Promise<void>;
  reorder(courseVersionId: CourseVersionId, sectionIds: SectionId[]): Promise<void>;
}

export interface ILessonRepository {
  findById(id: LessonId): Promise<Lesson | null>;
  findBySection(sectionId: SectionId): Promise<Lesson[]>;
  create(lesson: Lesson): Promise<Lesson>;
  update(id: LessonId, updates: Partial<Lesson>): Promise<Lesson>;
  delete(id: LessonId): Promise<void>;
  reorder(sectionId: SectionId, lessonIds: LessonId[]): Promise<void>;
}

export interface IContentBlockRepository {
  findById(id: ContentBlockId): Promise<ContentBlock | null>;
  findByLesson(lessonId: LessonId): Promise<ContentBlock[]>;
  create(block: ContentBlock): Promise<ContentBlock>;
  update(id: ContentBlockId, updates: Partial<ContentBlock>): Promise<ContentBlock>;
  delete(id: ContentBlockId): Promise<void>;
  reorder(lessonId: LessonId, blockIds: ContentBlockId[]): Promise<void>;
}
