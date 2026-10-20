import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import AdmZip from 'adm-zip';
import {
  extractArchive,
  sniffMimeTypeFromBuffer,
  detectMimeType,
  detectResourceType,
  isCodeExtension,
  isUntrustedCode,
  AtomicImportManager,
  CourseImportEngine,
  SecurityValidationError,
} from '../dist/index.js';
import { ResourceType, ImportJobStatus } from '@coursenest/domain';

describe('Importer Package & Security Architecture', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `coursenest-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('detects MIME types from magic byte buffers accurately', () => {
    // 1. PDF
    const pdfBuf = Buffer.from('%PDF-1.4 header contents...');
    assert.equal(sniffMimeTypeFromBuffer(pdfBuf), 'application/pdf');

    // 2. PNG
    const pngBuf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
    assert.equal(sniffMimeTypeFromBuffer(pngBuf), 'image/png');

    // 3. JPEG
    const jpegBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    assert.equal(sniffMimeTypeFromBuffer(jpegBuf), 'image/jpeg');

    // 4. ZIP
    const zipBuf = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    assert.equal(sniffMimeTypeFromBuffer(zipBuf), 'application/zip');

    // 5. GZIP
    const gzipBuf = Buffer.from([0x1F, 0x8B, 0x08, 0x00]);
    assert.equal(sniffMimeTypeFromBuffer(gzipBuf), 'application/gzip');

    // 6. Scripts
    const pyScript = Buffer.from('#!/usr/bin/env python\nprint("hello")');
    assert.equal(sniffMimeTypeFromBuffer(pyScript), 'text/x-python');

    const shScript = Buffer.from('#!/bin/bash\necho "hello"');
    assert.equal(sniffMimeTypeFromBuffer(shScript), 'application/x-sh');

    // 7. Fallback to extension when buffer is plain text
    const textBuf = Buffer.from('Ordinary text document');
    assert.equal(detectMimeType('notes.md', textBuf), 'text/markdown');
  });

  it('safely extracts legitimate ZIP archives into sandbox', async () => {
    const zip = new AdmZip();
    zip.addFile('module1/lecture1.txt', Buffer.from('Lecture 1 content'));
    zip.addFile('module1/slides.pdf', Buffer.from('%PDF-1.4 fake pdf'));
    const zipPath = path.join(tempDir, 'valid.zip');
    zip.writeZip(zipPath);

    const sandbox = path.join(tempDir, 'sandbox');
    const extracted = await extractArchive(zipPath, sandbox);

    assert.equal(extracted.length, 2);
    assert.ok(extracted.includes('module1/lecture1.txt'));
    assert.ok(extracted.includes('module1/slides.pdf'));

    const content = await fs.readFile(path.join(sandbox, 'module1/lecture1.txt'), 'utf-8');
    assert.equal(content, 'Lecture 1 content');
  });

  it('blocks Zip Slip directory traversal attacks strictly', async () => {
    const zip = new AdmZip();
    zip.addFile('safe.txt', Buffer.from('malicious payload'));
    // Manually force path traversal entryName to simulate real Zip Slip attack
    zip.getEntries()[0]!.entryName = '../../dangerous.txt';
    const maliciousZip = path.join(tempDir, 'evil.zip');
    zip.writeZip(maliciousZip);

    const sandbox = path.join(tempDir, 'sandbox');
    await assert.rejects(
      async () => {
        await extractArchive(maliciousZip, sandbox);
      },
      (err: Error) => {
        return err instanceof SecurityValidationError && err.message.includes('Path traversal detected');
      },
    );

    // Verify malicious file was NOT written outside sandbox
    const escapedFile = path.join(tempDir, 'dangerous.txt');
    let exists = false;
    try {
      await fs.access(escapedFile);
      exists = true;
    } catch {
      exists = false;
    }
    assert.equal(exists, false, 'Malicious file must not be created on disk');
  });

  it('safeguards untrusted code and sandboxes it as static text only', () => {
    assert.equal(isCodeExtension('.py'), true);
    assert.equal(isCodeExtension('.sh'), true);
    assert.equal(isCodeExtension('.js'), true);
    assert.equal(isCodeExtension('.cpp'), true);
    assert.equal(isCodeExtension('.pdf'), false);
    assert.equal(isCodeExtension('.mp4'), false);

    assert.equal(isUntrustedCode(ResourceType.SourceCode), true);
    assert.equal(isUntrustedCode(ResourceType.Video), false);
    assert.equal(detectResourceType('exploit.py'), ResourceType.SourceCode);
  });

  it('operates AtomicImportManager staging, rollback, and commit cleanly', async () => {
    const manager = new AtomicImportManager();
    const stagingBase = path.join(tempDir, 'staging');
    const stagedDir = await manager.startJob(stagingBase);
    assert.ok(stagedDir.startsWith(stagingBase));

    await manager.stageFile('lesson1.md', Buffer.from('# Lesson 1'));
    await manager.stageFile('assets/img.png', Buffer.from('png data'));

    assert.equal(manager.getStagedFiles().length, 2);

    // Rollback test
    await manager.rollback();
    let dirExists = true;
    try {
      await fs.access(stagedDir);
    } catch {
      dirExists = false;
    }
    assert.equal(dirExists, false, 'Staged directory should be purged on rollback');

    // Commit test
    const stagedDir2 = await manager.startJob(stagingBase);
    await manager.stageFile('final.txt', Buffer.from('final content'));
    const destination = path.join(tempDir, 'dest');
    const committed = await manager.commit(destination);

    assert.equal(committed.length, 1);
    assert.equal(committed[0], 'final.txt');
    const destContent = await fs.readFile(path.join(destination, 'final.txt'), 'utf-8');
    assert.equal(destContent, 'final content');
  });

  it('runs CourseImportEngine analyzeInventory with security checks', async () => {
    const engine = new CourseImportEngine();
    const result = await engine.analyzeInventory(
      [
        { relativePath: 'Week 1/Lecture.mp4', sizeBytes: 1048576 },
        { relativePath: 'Week 1/Script.py', sizeBytes: 2048 },
        { relativePath: 'Week 1/unsupported.xyz', sizeBytes: 512 },
      ],
      {
        jobId: 'job-1',
        sourceType: 'archive',
        sandboxDir: tempDir,
      },
    );

    assert.equal(result.status, ImportJobStatus.AwaitingReview);
    assert.equal(result.report.filesImported.length, 2);
    assert.equal(result.report.filesUnsupported.length, 1);

    // Verify python script was detected and marked as non-executable static text
    const pyEntry = result.report.filesImported.find((f) => f.originalPath.endsWith('.py'));
    assert.ok(pyEntry);
    assert.ok(pyEntry.reason?.includes('Untrusted code; sandboxed as static text resource'));
  });
});
