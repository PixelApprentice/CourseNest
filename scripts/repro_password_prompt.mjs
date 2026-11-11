// Repro script for B2: Password Prompt on 75-Part Zip Archive
// Simulates the behavior of zipImporter.ts when processing 75 parts
// Shows how current code path causes prompt to fire more than once when an error or forceReprompt occurs.

import { CoursePasswordManager } from '../packages/importer/dist/index.js';
import assert from 'node:assert';

console.log('--- REPRO B2: 75-Part Archive Password Prompt Count ---');

async function testPasswordPromptCount() {
  const manager = new CoursePasswordManager();
  const batchKey = 'import-batch-75-parts-course';
  let promptCount = 0;

  const mockPromptDialog = async (ctx) => {
    promptCount++;
    console.log(`[Dialog Triggered #${promptCount}] Requesting password for part: ${ctx.partName}`);
    return {
      password: 'correct-course-secret',
      rememberForCourse: false,
    };
  };

  // Simulate zipImporter.ts loop across 75 parts:
  // Part 1 prompts user.
  // In current code:
  // let lastError = currentCoursePassword ? 'Course password failed...' : undefined;
  // If extractWith7zWasm fails or sets lastError, forceReprompt is true!
  
  let currentCoursePassword = null;
  const parts = Array.from({ length: 75 }, (_, i) => `CoursePart_${String(i + 1).padStart(2, '0')}.zip`);

  for (let i = 0; i < parts.length; i++) {
    const partName = parts[i];
    
    // In current zipImporter.ts line 565:
    let lastError = (i > 0 && !currentCoursePassword) || (i === 1) // e.g. Part 2 failed software unpack
      ? `Course password failed for part "${partName}". Please enter the password for this part.`
      : undefined;

    // Emulate zipImporter.ts line 574:
    const entered = await manager.getCoursePassword(batchKey, {
      partName,
      forceReprompt: !!lastError,
      errorMessage: lastError,
      promptFn: mockPromptDialog,
    });

    if (entered && !currentCoursePassword) {
      currentCoursePassword = entered;
      manager.setSessionPassword(batchKey, entered);
    }
  }

  console.log(`Total prompt dialogs shown across 75 parts: ${promptCount}`);

  try {
    assert.strictEqual(promptCount, 1, `Expected EXACTLY 1 prompt dialog for 75 parts, but got ${promptCount}!`);
    console.log('PASS: Prompt count is 1');
  } catch (err) {
    console.error('FAIL (AS EXPECTED):', err.message);
  }
}

testPasswordPromptCount();
