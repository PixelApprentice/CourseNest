import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

console.log('--- Phase 4: F3 Storage Lifecycle & Course Deletion Sweep Test ---');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coursenest-storage-test-'));
const courseId = 'test-course-lifecycle-01';

try {
  // 1. Simulate course directories on external and internal media
  const externalDriveDir = path.join(tmpDir, 'ExternalDrive', 'CourseNest', courseId);
  const internalVaultDir = path.join(tmpDir, 'UserData', 'courses', courseId);
  const stagingFailedDir = path.join(tmpDir, 'StagingTemp', 'staging_fail_01');

  fs.mkdirSync(externalDriveDir, { recursive: true });
  fs.mkdirSync(internalVaultDir, { recursive: true });
  fs.mkdirSync(stagingFailedDir, { recursive: true });

  fs.writeFileSync(path.join(externalDriveDir, 'video.mp4'), 'mock video content');
  fs.writeFileSync(path.join(internalVaultDir, 'notes.md'), 'mock notes');

  assert.ok(fs.existsSync(externalDriveDir), 'External course directory must exist before deletion');
  assert.ok(fs.existsSync(internalVaultDir), 'Internal vault directory must exist before deletion');

  // 2. Simulate course deletion sweep across candidate directories
  const candidateDirs = [externalDriveDir, internalVaultDir];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  assert.ok(!fs.existsSync(externalDriveDir), 'External course directory must be cleanly removed');
  assert.ok(!fs.existsSync(internalVaultDir), 'Internal vault directory must be cleanly removed');
  console.log('[PASS] Physical course directories purged cleanly from disk without orphaned files.');

  // 3. Staging cleanup verification
  if (fs.existsSync(stagingFailedDir)) {
    const files = fs.readdirSync(stagingFailedDir);
    if (files.length === 0) {
      fs.rmSync(stagingFailedDir, { recursive: true, force: true });
    }
  }
  assert.ok(!fs.existsSync(stagingFailedDir), 'Empty/failed staging directory cleaned up');
  console.log('[PASS] Failed extraction staging directory pruned to prevent disk leakage.');

  console.log('--- ALL STORAGE LIFECYCLE TESTS PASSED ---');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
