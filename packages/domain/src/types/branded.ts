declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type CourseId = Brand<string, 'CourseId'>;
export type CourseVersionId = Brand<string, 'CourseVersionId'>;
export type SectionId = Brand<string, 'SectionId'>;
export type LessonId = Brand<string, 'LessonId'>;
export type ContentBlockId = Brand<string, 'ContentBlockId'>;
export type ResourceId = Brand<string, 'ResourceId'>;
export type ActivityId = Brand<string, 'ActivityId'>;
export type UserId = Brand<string, 'UserId'>;
export type ImportJobId = Brand<string, 'ImportJobId'>;
export type EnrollmentId = Brand<string, 'EnrollmentId'>;

export function createId<T extends string>(value: string): Brand<string, T> {
  return value as Brand<string, T>;
}
