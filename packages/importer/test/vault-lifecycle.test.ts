import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// Mirror of resolveCourseStorageDir logic in ipc-handlers.ts
function resolveCourseStorageDir(baseDir: string, courseId: string): string {
  const normBase = path.resolve(baseDir);
  const baseName = path.basename(normBase).toLowerCase();
  if (baseName === 'coursenest_courses') {
    return path.join(normBase, courseId);
  }
  return path.join(normBase, 'CourseNest_courses', courseId);
}

describe('Storage & Vault Lifecycle Regressions', () => {
  it('prevents nested coursenest_courses when user selects existing CourseNest_courses directory', () => {
    const userSelectedPath = '/run/media/salahudin/external hd/CourseNest_courses';
    const courseId = 'course-react-101';
    const resolvedDir = resolveCourseStorageDir(userSelectedPath, courseId);

    // Should NOT be /run/media/salahudin/external hd/CourseNest_courses/coursenest_courses/course-react-101
    assert.equal(
      resolvedDir,
      '/run/media/salahudin/external hd/CourseNest_courses/course-react-101'
    );
  });

  it('creates CourseNest_courses when user selects the external drive root', () => {
    const driveRoot = '/run/media/salahudin/external hd';
    const courseId = 'course-react-101';
    const resolvedDir = resolveCourseStorageDir(driveRoot, courseId);

    assert.equal(
      resolvedDir,
      '/run/media/salahudin/external hd/CourseNest_courses/course-react-101'
    );
  });

  it('preserves empty course vault when all courses are deleted', () => {
    // Simulating localStorage behavior
    const mockStorage: Record<string, string> = {
      coursenest_offline_courses_v2: JSON.stringify([]),
    };

    function testGetVaultCourses(): any[] {
      const raw = mockStorage['coursenest_offline_courses_v2'];
      if (raw !== null && raw !== undefined) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [{ id: 'demo-1' }, { id: 'demo-2' }];
    }

    const courses = testGetVaultCourses();
    assert.equal(courses.length, 0, 'Empty vault must not resurrect pre-bundled demo courses');
  });

  it('generates dynamic offline flashcards from actual lesson text instead of hardcoded cache lines', () => {
    const lessonTitle = 'Introduction to Photosynthesis';
    const sampleChunks = [
      {
        chunk: {
          id: 'chunk-1',
          content: 'Chlorophyll molecules in the thylakoid membrane absorb blue and red light while reflecting green light. Light-dependent reactions convert solar photon energy into chemical energy stored in ATP and NADPH.',
          citationBadge: '[02:15]',
          sourceType: 'transcript' as const,
          courseId: 'c1',
          lessonId: 'l1',
          tokensEstimate: 30,
        },
        score: 0.95,
        matchingTerms: ['chlorophyll', 'light'],
        excerpt: 'Chlorophyll molecules absorb light...',
      },
    ];

    // Mirror of generateOfflineLocalAnswer flashcard generation
    const flashcardsToCreate: Array<{ question: string; answer: string; hint: string }> = [];
    sampleChunks.forEach((sc) => {
      const text = sc.chunk.content.replace(/\s+/g, ' ').trim();
      const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
      if (sentences.length > 0) {
        const qText = sentences[0]!;
        const aText = sentences.slice(1, 3).join(' ') || text.slice(0, 180);
        flashcardsToCreate.push({
          question: `Key concept from ${sc.chunk.citationBadge || lessonTitle}: What is stated regarding "${qText.slice(0, 70)}..."?`,
          answer: aText.slice(0, 220),
          hint: `Review ${sc.chunk.citationBadge || lessonTitle}`,
        });
      }
    });

    assert.equal(flashcardsToCreate.length, 1);
    assert.ok(flashcardsToCreate[0]!.question.includes('Chlorophyll'));
    assert.ok(flashcardsToCreate[0]!.answer.includes('ATP and NADPH'));
    assert.ok(!flashcardsToCreate[0]!.answer.includes('SRAM'), 'Must not contain hardcoded CPU cache text');
  });
});
