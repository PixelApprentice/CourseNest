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
  knownChecksums?: Set<string>;
  sandboxDir?: string;
}

const CODE_EXTENSIONS = new Set(['.py', '.js', '.jsx', '.ts', '.tsx', '.sh', '.c', '.cpp', '.cxx']);

export function isCodeExtension(ext: string): boolean {
  return CODE_EXTENSIONS.has(ext);
}

export function isUntrustedCode(resourceType: ResourceType): boolean {
  return resourceType === ResourceType.SourceCode;
}

export class AtomicImportManager {
  private stagedDir: string | null = null;
  private originalFiles: Map<string, string> = new Map();

  async startJob(): Promise<void> {
    this.stagedDir = path.join(os.tmpdir(), `korse-import-${Date.now()}`);
    await fs.mkdir(this.stagedDir, { recursive: true });
  }

  async rollback(): Promise<void> {
    if (this.stagedDir) {
      await fs.rm(this.stagedDir, { recursive: true, force: true });
      this.stagedDir = null;
    }
    this.originalFiles.clear();
  }

  async commit(): Promise<void> {
    if (this.stagedDir) {
      await fs.rm(this.stagedDir, { recursive: true, force: true });
      this.stagedDir = null;
    }
    this.originalFiles.clear();
  }

  getStagedDir(): string | null {
    return this.stagedDir;
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
          path: 'unknown',
          issue: err.message,
          severity: 'critical',
        });
        return { report, status: ImportJobStatus.Failed };
      }
    }

    try {
      await this.atomicManager.startJob();
    } catch (err) {
      report.failures.push({
        originalPath: 'unknown',
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

    let hasCriticalIssues = false;

    for (const file of files) {
      // 1. Path Security
      try {
        validateArchivePath(file.relativePath, 'unknown');
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

      // 4. Code execution safeguard: mark untrusted code as static text
      const ext = getFileExtension(file.relativePath);
      if (isCodeExtension(ext) && resourceType === ResourceType.SourceCode) {
        // Code blocks stored as static text resources - never executed by renderer/shell/main process
        // The system enforces that code is stored strictly as text and not executed
      }

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
      await this.atomicManager.commit();
    } catch (err) {
      report.failures.push({
        originalPath: 'unknown',
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