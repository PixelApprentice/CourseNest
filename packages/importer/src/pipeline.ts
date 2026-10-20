import type {
  ImportReport,
  ImportFileEntry,
} from '@coursenest/domain';
import { ImportJobStatus, ResourceType } from '@coursenest/domain';
import { validateArchivePath, validateFileSize, validateFileCount, SecurityValidationError } from './security.js';
import { detectResourceType, detectMimeType, getFileExtension } from './detector.js';
import { inferHierarchyFromPath } from './organizer.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export interface DiscoveredFile {
  relativePath: string;
  sizeBytes: number;
  checksumSha256?: string;
}

export interface ImportPipelineOptions {
  jobId: string;
  sourceType: 'archive' | 'directory' | 'files';
  sourcePath?: string;
  sandboxDir?: string;
  destinationDir?: string;
  knownChecksums?: Set<string>;
}

export const CODE_EXTENSIONS = new Set([
  '.py', '.js', '.jsx', '.ts', '.tsx', '.sh', '.bash', '.c', '.cpp', '.cxx', '.h', '.hpp',
  '.java', '.go', '.rs', '.php', '.rb', '.pl', '.sql',
]);

export function isCodeExtension(ext: string): boolean {
  return CODE_EXTENSIONS.has(ext.toLowerCase());
}

export function isUntrustedCode(resourceType: ResourceType, ext?: string): boolean {
  return resourceType === ResourceType.SourceCode || (ext ? isCodeExtension(ext) : false);
}

export class AtomicImportManager {
  private stagedDir: string | null = null;
  private stagedFiles: Set<string> = new Set();

  async startJob(baseStagingDir?: string): Promise<string> {
    const uniqueId = `korse-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.stagedDir = path.join(baseStagingDir ?? os.tmpdir(), uniqueId);
    await fs.mkdir(this.stagedDir, { recursive: true });
    return this.stagedDir;
  }

  async stageFile(relativePath: string, content: Buffer | string): Promise<string> {
    if (!this.stagedDir) {
      throw new Error('Import job not started. Call startJob() first.');
    }
    const targetPath = path.join(this.stagedDir, relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content);
    this.stagedFiles.add(relativePath);
    return targetPath;
  }

  async commit(destinationDir?: string): Promise<string[]> {
    if (!this.stagedDir) return [];

    const committedFiles: string[] = [];
    if (destinationDir) {
      await fs.mkdir(destinationDir, { recursive: true });
      for (const file of this.stagedFiles) {
        const src = path.join(this.stagedDir, file);
        const dest = path.join(destinationDir, file);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
        committedFiles.push(file);
      }
    }

    await this.rollback();
    return committedFiles;
  }

  async rollback(): Promise<void> {
    if (this.stagedDir) {
      await fs.rm(this.stagedDir, { recursive: true, force: true });
      this.stagedDir = null;
    }
    this.stagedFiles.clear();
  }

  getStagedDir(): string | null {
    return this.stagedDir;
  }

  getStagedFiles(): string[] {
    return Array.from(this.stagedFiles);
  }
}

export class CourseImportEngine {
  private atomicManager: AtomicImportManager;

  constructor() {
    this.atomicManager = new AtomicImportManager();
  }

  async analyzeInventory(
    files: DiscoveredFile[],
    options: ImportPipelineOptions,
  ): Promise<{ report: ImportReport; status: ImportJobStatus }> {
    const report: ImportReport = {
      filesDiscovered: [],
      filesImported: [],
      filesUnsupported: [],
      duplicates: [],
      failures: [],
      manualReviewRequired: [],
      aiSuggestions: [],
      securityIssues: [],
    };

    try {
      validateFileCount(files.length);
    } catch (err) {
      if (err instanceof SecurityValidationError) {
        report.securityIssues.push({
          path: options.sourcePath ?? 'archive',
          issue: err.message,
          severity: 'critical',
        });
        return { report, status: ImportJobStatus.Failed };
      }
    }

    try {
      await this.atomicManager.startJob(options.sandboxDir);
    } catch (err) {
      report.failures.push({
        originalPath: options.sourcePath ?? 'sandbox',
        error: (err as Error).message,
        isRecoverable: false,
      });
      return { report, status: ImportJobStatus.Failed };
    }

    const seenChecksums = new Map<string, string>();
    if (options.knownChecksums) {
      for (const chk of options.knownChecksums) {
        seenChecksums.set(chk, 'existing-resource');
      }
    }

    const targetSandbox = options.sandboxDir ?? this.atomicManager.getStagedDir() ?? os.tmpdir();
    let hasCriticalIssues = false;

    for (const file of files) {
      // 1. Path Security
      try {
        validateArchivePath(file.relativePath, targetSandbox);
      } catch (err) {
        if (err instanceof SecurityValidationError) {
          report.securityIssues.push({
            path: file.relativePath,
            issue: err.message,
            severity: 'critical',
          });
          hasCriticalIssues = true;
          report.failures.push({
            originalPath: file.relativePath,
            error: err.message,
            isRecoverable: false,
          });
          continue;
        }
      }

      // 2. File Size Security
      try {
        validateFileSize(file.sizeBytes, file.relativePath);
      } catch (err) {
        if (err instanceof SecurityValidationError) {
          report.securityIssues.push({
            path: file.relativePath,
            issue: err.message,
            severity: 'warning',
          });
          hasCriticalIssues = true;
          report.failures.push({
            originalPath: file.relativePath,
            error: err.message,
            isRecoverable: false,
          });
          continue;
        }
      }

      // 3. Type Detection
      const resourceType = detectResourceType(file.relativePath);
      const mimeType = detectMimeType(file.relativePath);
      const hierarchy = inferHierarchyFromPath(file.relativePath);
      const ext = getFileExtension(file.relativePath);

      const entry: ImportFileEntry = {
        originalPath: file.relativePath,
        filename: file.relativePath.split('/').pop() ?? file.relativePath,
        mimeType,
        fileSizeBytes: file.sizeBytes,
        checksumSha256: file.checksumSha256,
        suggestedSection: hierarchy.suggestedSectionTitle,
        suggestedLesson: hierarchy.suggestedLessonTitle,
        status: resourceType === ResourceType.Unknown ? 'unsupported' : 'imported',
      };

      // 4. Code execution safeguard: flag code files as static text only
      if (isUntrustedCode(resourceType, ext)) {
        entry.reason = 'Untrusted code; sandboxed as static text resource (non-executable)';
      }

      report.filesDiscovered.push(entry);

      if (resourceType === ResourceType.Unknown) {
        entry.status = 'unsupported';
        entry.reason = 'File format is not recognized or supported';
        report.filesUnsupported.push(entry);
        continue;
      }

      // 5. Duplicate Check
      if (file.checksumSha256) {
        const existing = seenChecksums.get(file.checksumSha256);
        if (existing) {
          report.duplicates.push({
            originalPath: file.relativePath,
            existingResourcePath: existing,
            checksumSha256: file.checksumSha256,
            action: 'reused',
          });
        } else {
          seenChecksums.set(file.checksumSha256, file.relativePath);
        }
      }

      report.filesImported.push(entry);
    }

    // If critical issues, rollback and fail
    if (hasCriticalIssues) {
      await this.atomicManager.rollback();
      return { report, status: ImportJobStatus.Failed };
    }

    // Commit staged files atomically
    try {
      await this.atomicManager.commit(options.destinationDir);
    } catch (err) {
      report.failures.push({
        originalPath: options.destinationDir ?? 'destination',
        error: (err as Error).message,
        isRecoverable: true,
      });
      await this.atomicManager.rollback();
      hasCriticalIssues = true;
    }

    const status = hasCriticalIssues
      ? ImportJobStatus.Failed
      : report.filesUnsupported.length > 0 || report.failures.length > 0
        ? ImportJobStatus.AwaitingReview
        : ImportJobStatus.Approved;

    return { report, status };
  }
}
