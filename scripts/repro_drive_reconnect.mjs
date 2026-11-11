// Repro script for B1: External Drive Reconnect
// Simulates user's directory structure: <Drive>/CourseNest/<Course1>, <Drive>/CourseNest/<Course2>
// Demonstrates failure to detect or recover courses when drive is reconnected or mount point changes.

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const TEST_ROOT = path.join(process.cwd(), '.test_drive_reconnect');
if (fs.existsSync(TEST_ROOT)) fs.rmSync(TEST_ROOT, { recursive: true, force: true });
fs.mkdirSync(TEST_ROOT, { recursive: true });

const MOUNT_A = path.join(TEST_ROOT, 'mount_usb_a');
const MOUNT_B = path.join(TEST_ROOT, 'mount_usb_b');

// Create standard external drive layout as specified by user:
// Drive root contains "CourseNest" folder with "Course1" and "Course2"
const courseNestDirA = path.join(MOUNT_A, 'CourseNest');
fs.mkdirSync(path.join(courseNestDirA, 'Course1'), { recursive: true });
fs.mkdirSync(path.join(courseNestDirA, 'Course2'), { recursive: true });

// Course manifests
fs.writeFileSync(
  path.join(courseNestDirA, 'Course1', 'coursenest-manifest.json'),
  JSON.stringify({ id: 'c1', title: 'Course 1', sections: [{ id: 's1', title: 'Sec 1', lessons: [] }] }, null, 2)
);
fs.writeFileSync(
  path.join(courseNestDirA, 'Course2', 'coursenest-manifest.json'),
  JSON.stringify({ id: 'c2', title: 'Course 2', sections: [{ id: 's1', title: 'Sec 1', lessons: [] }] }, null, 2)
);

console.log('--- REPRO B1: Testing Drive Scan and Reconnect with CourseNest folder ---');

// Emulate current scanDirectoryRecursive from ipc-handlers.ts:1008
async function currentScanDirectoryRecursive(baseDir) {
  const discovered = [];
  const dirsToCheck = new Set();
  dirsToCheck.add(baseDir);

  try {
    const directEntries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    for (const entry of directEntries) {
      if (entry.isDirectory()) {
        const childDir = path.join(baseDir, entry.name);
        dirsToCheck.add(childDir);

        // CURRENT CODE in ipc-handlers.ts:1026 strictly checks 'coursenest_courses':
        if (entry.name.toLowerCase() === 'coursenest_courses') {
          try {
            const subEntries = await fs.promises.readdir(childDir, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory()) dirsToCheck.add(path.join(childDir, sub.name));
            }
          } catch {}
        }
      }
    }
  } catch {}

  for (const d of dirsToCheck) {
    const candidate = path.join(d, 'coursenest-manifest.json');
    if (fs.existsSync(candidate)) {
      try {
        const data = JSON.parse(await fs.promises.readFile(candidate, 'utf-8'));
        if (data && (data.id || data.title) && Array.isArray(data.sections)) {
          discovered.push({
            ...data,
            storageTier: 'external',
            externalMountPath: baseDir,
            externalCourseDir: d,
            isExternalMissing: false,
          });
        }
      } catch {}
    }
  }
  return discovered;
}

// Emulate current checkCoursePathAccess from ipc-handlers.ts:508
function currentResolveTargetDir(activeMountPath, courseId, relativeCourseDir, courseDir, mountPath) {
  let targetDir = null;
  if (activeMountPath) {
    if (relativeCourseDir) {
      targetDir = path.join(activeMountPath, relativeCourseDir);
    } else if (courseDir && mountPath && courseDir.startsWith(mountPath)) {
      targetDir = courseDir.replace(mountPath, activeMountPath);
    } else if (courseDir) {
      targetDir = courseDir;
    } else {
      // CURRENT CODE in ipc-handlers.ts:519 assumes CourseNest_courses/<id>
      targetDir = path.join(activeMountPath, 'CourseNest_courses', courseId);
    }
  } else if (courseDir) {
    targetDir = courseDir;
  }
  return targetDir;
}

async function runRepro() {
  console.log('[Step 1] Scanning drive root:', MOUNT_A);
  const discovered = await currentScanDirectoryRecursive(MOUNT_A);
  console.log(`Discovered ${discovered.length} courses:`, discovered.map(c => c.title));

  try {
    // This MUST FAIL because current code looks for coursenest_courses, not CourseNest
    assert.strictEqual(
      discovered.length,
      2,
      `Expected current scanner to discover 2 courses in <Drive>/CourseNest/, but discovered ${discovered.length}!`
    );
    console.log('UNEXPECTED: Scanner passed');
  } catch (err) {
    console.error('FAIL (AS EXPECTED):', err.message);
  }

  // Step 2: Test path resolution when mount point changes from MOUNT_A to MOUNT_B
  // Suppose course was imported as CourseNest/Course1 without relativeCourseDir explicitly stored
  const targetOnNewMount = currentResolveTargetDir(MOUNT_B, 'c1', undefined, undefined, MOUNT_A);
  console.log('[Step 2] Resolved path on new mount:', targetOnNewMount);
  try {
    assert.ok(
      targetOnNewMount.includes('CourseNest') && !targetOnNewMount.includes('CourseNest_courses'),
      `Expected targetDir to resolve to CourseNest/c1 or CourseNest/Course1, but got ${targetOnNewMount}`
    );
  } catch (err) {
    console.error('FAIL (AS EXPECTED):', err.message);
  }

  // Clean up
  try { fs.rmSync(TEST_ROOT, { recursive: true, force: true }); } catch {}
}

runRepro();
