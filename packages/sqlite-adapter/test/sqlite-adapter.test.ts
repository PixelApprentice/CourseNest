import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  createSqliteConnection,
  initializeSqliteDatabase,
  SqliteCourseRepository,
  SqliteCourseVersionRepository,
  SqliteSectionRepository,
  SqliteLessonRepository,
  SqliteContentBlockRepository,
  SqliteEnrollmentRepository,
  SqliteProgressRepository,
  SqliteNoteRepository,
  SqliteResourceRepository,
  SqliteImportJobRepository,
} from '../dist/index.js';
import type {
  Course,
  CourseVersion,
  Section,
  Lesson,
  ContentBlock,
  Enrollment,
  LessonProgress,
  Note,
  Resource,
  ImportJob,
  CourseId,
  CourseVersionId,
  SectionId,
  LessonId,
  ContentBlockId,
  EnrollmentId,
  ResourceId,
  ImportJobId,
  UserId,
} from '@coursenest/domain';

describe('SQLite Adapter & Repositories', () => {
  let rawDb: DatabaseSync;
  let db: ReturnType<typeof createSqliteConnection>;

  beforeEach(() => {
    rawDb = new DatabaseSync(':memory:');
    db = createSqliteConnection(rawDb);
    initializeSqliteDatabase(db);
  });

  it('initializes all required schema tables and enables foreign keys', () => {
    const tables = rawDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);

    assert.ok(tables.includes('courses'), 'courses table exists');
    assert.ok(tables.includes('course_versions'), 'course_versions table exists');
    assert.ok(tables.includes('sections'), 'sections table exists');
    assert.ok(tables.includes('lessons'), 'lessons table exists');
    assert.ok(tables.includes('content_blocks'), 'content_blocks table exists');
    assert.ok(tables.includes('resources'), 'resources table exists');
    assert.ok(tables.includes('enrollments'), 'enrollments table exists');
    assert.ok(tables.includes('lesson_progress'), 'lesson_progress table exists');
    assert.ok(tables.includes('content_block_progress'), 'content_block_progress table exists');
    assert.ok(tables.includes('quiz_attempts'), 'quiz_attempts table exists');
    assert.ok(tables.includes('bookmarks'), 'bookmarks table exists');
    assert.ok(tables.includes('notes'), 'notes table exists');
    assert.ok(tables.includes('import_jobs'), 'import_jobs table exists');
  });

  it('manages Course, Version, Section, Lesson, and ContentBlock lifecycle', async () => {
    const courseRepo = new SqliteCourseRepository(db);
    const versionRepo = new SqliteCourseVersionRepository(db);
    const sectionRepo = new SqliteSectionRepository(db);
    const lessonRepo = new SqliteLessonRepository(db);
    const blockRepo = new SqliteContentBlockRepository(db);

    const courseId = 'course-1' as CourseId;
    const versionId = 'ver-1' as CourseVersionId;
    const sectionId = 'sec-1' as SectionId;
    const lessonId = 'les-1' as LessonId;
    const blockId = 'blk-1' as ContentBlockId;

    const course: Course = {
      id: courseId,
      title: 'Operating Systems & Architecture',
      description: 'Foundational systems course',
      language: 'en',
      instructorName: 'Linus Torvalds',
      subject: 'Computer Science',
      tags: ['kernel', 'c', 'hardware'],
      learningObjectives: ['Learn threads', 'Learn memory management'],
      localAvailability: 'available_offline',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await courseRepo.create(course);
    const fetchedCourse = await courseRepo.findById(courseId);
    assert.ok(fetchedCourse);
    assert.equal(fetchedCourse.title, 'Operating Systems & Architecture');
    assert.deepEqual(fetchedCourse.tags, ['kernel', 'c', 'hardware']);

    const version: CourseVersion = {
      id: versionId,
      courseId,
      versionNumber: '1.0.0',
      manifestSchemaVersion: '1.0.0',
      contentFingerprint: 'sha256:abc1234',
      state: 'published',
      changeSummary: 'Initial release',
      createdAt: '2026-01-01T00:00:00.000Z',
      publishedAt: '2026-01-02T00:00:00.000Z',
    };
    await versionRepo.create(version);
    const fetchedVersion = await versionRepo.findById(versionId);
    assert.ok(fetchedVersion);
    assert.equal(fetchedVersion.versionNumber, '1.0.0');

    const section: Section = {
      id: sectionId,
      courseVersionId: versionId,
      title: 'Section 1: Concurrency',
      position: 1,
      isOptional: false,
      prerequisiteSectionIds: [],
    };
    await sectionRepo.create(section);
    const sections = await sectionRepo.findByCourseVersion(versionId);
    assert.equal(sections.length, 1);
    assert.equal(sections[0]!.title, 'Section 1: Concurrency');

    const lesson: Lesson = {
      id: lessonId,
      sectionId,
      title: 'Lesson 1: Mutexes and Semaphores',
      learningObjectives: ['Understand locks'],
      position: 1,
      completionPolicy: 'view_required',
      isRequired: true,
      prerequisiteLessonIds: [],
      revision: 1,
    };
    await lessonRepo.create(lesson);
    const lessons = await lessonRepo.findBySection(sectionId);
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0]!.title, 'Lesson 1: Mutexes and Semaphores');

    const block: ContentBlock = {
      id: blockId,
      lessonId,
      type: 'video',
      position: 1,
      displayMetadata: { streamUrl: 'video.mp4', duration: 1200 },
      isRequired: true,
      schemaVersion: '1.0.0',
    };
    await blockRepo.create(block);
    const blocks = await blockRepo.findByLesson(lessonId);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]!.type, 'video');
  });

  it('tracks Enrollments, Progress, and Notes', async () => {
    const courseRepo = new SqliteCourseRepository(db);
    const versionRepo = new SqliteCourseVersionRepository(db);
    const sectionRepo = new SqliteSectionRepository(db);
    const lessonRepo = new SqliteLessonRepository(db);

    const courseId = 'course-p1' as CourseId;
    const versionId = 'ver-p1' as CourseVersionId;
    const sectionId = 'sec-p1' as SectionId;
    const lessonId = 'les-10' as LessonId;

    await courseRepo.create({
      id: courseId,
      title: 'Progress Test Course',
      description: 'Desc',
      language: 'en',
      instructorName: 'Prof. Ada',
      subject: 'Math',
      tags: [],
      learningObjectives: [],
      localAvailability: 'available_offline',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await versionRepo.create({
      id: versionId,
      courseId,
      versionNumber: '1.0.0',
      manifestSchemaVersion: '1.0.0',
      contentFingerprint: 'sha256:fp1',
      state: 'published',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await sectionRepo.create({
      id: sectionId,
      courseVersionId: versionId,
      title: 'Math Foundations',
      position: 1,
      isOptional: false,
      prerequisiteSectionIds: [],
    });

    await lessonRepo.create({
      id: lessonId,
      sectionId,
      title: 'Linear Algebra Basics',
      learningObjectives: [],
      position: 1,
      completionPolicy: 'view_required',
      isRequired: true,
      prerequisiteLessonIds: [],
      revision: 1,
    });

    const enrollRepo = new SqliteEnrollmentRepository(db);
    const progressRepo = new SqliteProgressRepository(db);
    const noteRepo = new SqliteNoteRepository(db);

    const userId = 'user-123' as UserId;
    const enrollId = 'enroll-1' as EnrollmentId;
    const noteId = 'note-1';

    const enrollment: Enrollment = {
      id: enrollId,
      userId,
      courseId,
      enrolledAt: '2026-01-10T00:00:00.000Z',
      overallProgressPercent: 50,
      syncStatus: 'synced',
      lastAccessedAt: '2026-01-12T00:00:00.000Z',
    };
    await enrollRepo.create(enrollment);

    const userEnrollments = await enrollRepo.findByUser(userId);
    assert.equal(userEnrollments.length, 1);
    assert.equal(userEnrollments[0]!.overallProgressPercent, 50);

    const progress: LessonProgress = {
      enrollmentId: enrollId,
      lessonId,
      isCompleted: true,
      timeSpentSeconds: 900,
      completedAt: '2026-01-12T00:00:00.000Z',
      lastAccessedAt: '2026-01-12T00:00:00.000Z',
    };
    await progressRepo.upsertLessonProgress(progress);

    const fetchedProgress = await progressRepo.getLessonProgress(enrollId, lessonId);
    assert.ok(fetchedProgress);
    assert.equal(fetchedProgress.isCompleted, true);
    assert.equal(fetchedProgress.timeSpentSeconds, 900);

    const note: Note = {
      id: noteId,
      enrollmentId: enrollId,
      lessonId,
      content: 'Important formula on page 42',
      createdAt: '2026-01-12T00:00:00.000Z',
      updatedAt: '2026-01-12T00:00:00.000Z',
    };
    await noteRepo.create(note);

    const notes = await noteRepo.findByLesson(enrollId, lessonId);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]!.content, 'Important formula on page 42');
  });

  it('manages Resources and ImportJobs', async () => {
    const resRepo = new SqliteResourceRepository(db);
    const importRepo = new SqliteImportJobRepository(db);

    const resourceId = 'res-1' as ResourceId;
    const resource: Resource = {
      id: resourceId,
      originalFilename: 'lecture_slides.pdf',
      displayName: 'Lecture Slides',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048576,
      storagePath: '/data/resources/res-1.pdf',
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      resourceType: 'pdf',
      isIndexed: true,
      importedAt: '2026-01-01T00:00:00.000Z',
    };

    await resRepo.create(resource);
    const byHash = await resRepo.findByChecksum('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.ok(byHash);
    assert.equal(byHash.originalFilename, 'lecture_slides.pdf');

    const jobId = 'job-1' as ImportJobId;
    const job: ImportJob = {
      id: jobId,
      sourceType: 'archive',
      sourcePath: '/uploads/course.zip',
      status: 'pending',
      totalFiles: 10,
      processedFiles: 0,
      importedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      duplicateFiles: 0,
      startedAt: '2026-01-01T00:00:00.000Z',
    };
    await importRepo.create(job);

    await importRepo.update(jobId, { processedFiles: 6, importedFiles: 5, status: 'processing' });
    const updatedJob = await importRepo.findById(jobId);
    assert.ok(updatedJob);
    assert.equal(updatedJob.processedFiles, 6);
    assert.equal(updatedJob.status, 'processing');
  });
});
