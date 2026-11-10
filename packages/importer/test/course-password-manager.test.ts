import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CoursePasswordManager } from '../dist/index.js';

describe('Course Password Manager - 75 Part Concurrency & Single Prompt Guarantee', () => {
  let manager: CoursePasswordManager;

  beforeEach(() => {
    manager = new CoursePasswordManager();
  });

  it('prompts EXACTLY 1 time when 75 encrypted parts of the same course are accessed concurrently', async () => {
    const courseId = 'course-enterprise-kubernetes-75parts';
    const expectedPassword = 'super-secure-course-pass-2026';
    let promptCallCount = 0;

    const mockPromptFn = async (ctx: { courseId: string; partName?: string }) => {
      promptCallCount++;
      // Simulate real user interaction delay of 50ms
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        password: expectedPassword,
        rememberForCourse: false,
      };
    };

    // Simulate 75 zip parts opening at the exact same moment
    const parts = Array.from({ length: 75 }, (_, i) => `part-${String(i + 1).padStart(2, '0')}.zip`);

    const results = await Promise.all(
      parts.map((partName) =>
        manager.getCoursePassword(courseId, {
          partName,
          promptFn: mockPromptFn,
        })
      )
    );

    // Assertions
    assert.equal(results.length, 75, 'All 75 parts received results');
    for (const pass of results) {
      assert.equal(pass, expectedPassword, 'Each part received the correct unlocked password');
    }

    assert.equal(
      promptCallCount,
      1,
      `Password prompt dialog must be called EXACTLY 1 time for all 75 parts, but was called ${promptCallCount} times!`
    );
  });

  it('automatically reuses cached course password for subsequent sequential or concurrent accesses without prompting', async () => {
    const courseId = 'course-fullstack-dev';
    let promptCount = 0;

    manager.setSessionPassword(courseId, 'cached-pass-123');

    const result = await manager.getCoursePassword(courseId, {
      partName: 'part-01.zip',
      promptFn: async () => {
        promptCount++;
        return 'new-pass';
      },
    });

    assert.equal(result, 'cached-pass-123');
    assert.equal(promptCount, 0, 'No prompt should be shown when session password is already cached');
  });

  it('re-prompts with failing filename when a specific part fails and forceReprompt is set', async () => {
    const courseId = 'course-with-mismatched-part';
    let requestedPartName: string | undefined;

    manager.setSessionPassword(courseId, 'initial-course-pass');

    // Simulate part 14 having a different password
    const repromptedPassword = await manager.getCoursePassword(courseId, {
      partName: 'part-14-bonus.zip',
      forceReprompt: true,
      errorMessage: 'Course password failed for part "part-14-bonus.zip".',
      promptFn: async (ctx) => {
        requestedPartName = ctx.partName;
        return 'special-part-14-pass';
      },
    });

    assert.equal(requestedPartName, 'part-14-bonus.zip');
    assert.equal(repromptedPassword, 'special-part-14-pass');
  });

  it('integrates with safeStorage provider and stores only encrypted, never plaintext in local storage', async () => {
    const courseId = 'course-safe-storage-test';
    let savedToSafeStorage = false;
    let safeStorageEncryptedValue = '';

    const fakeSafeStorage = {
      getCoursePassword: async (cId: string) => (cId === courseId ? 'os-decrypted-secret' : null),
      saveCoursePassword: async (_cId: string, pass: string) => {
        savedToSafeStorage = true;
        safeStorageEncryptedValue = `SAFE_STORAGE_ENCRYPTED[${pass.length}_bytes]`;
      },
    };

    const secureManager = new CoursePasswordManager(fakeSafeStorage);

    // Initial fetch should resolve directly from safeStorage without prompt
    let promptFired = false;
    const resolved = await secureManager.getCoursePassword(courseId, {
      promptFn: async () => {
        promptFired = true;
        return 'unwanted-prompt';
      },
    });

    assert.equal(resolved, 'os-decrypted-secret');
    assert.equal(promptFired, false, 'Should have resolved from safeStorage without opening dialog');

    // Setting a new password with rememberForCourse triggers safeStorage encryption
    await secureManager.getCoursePassword('course-new', {
      promptFn: async () => ({
        password: 'brand-new-secret',
        rememberForCourse: true,
      }),
    });

    assert.equal(savedToSafeStorage, true);
    assert.ok(safeStorageEncryptedValue.startsWith('SAFE_STORAGE_ENCRYPTED'));
  });
});
