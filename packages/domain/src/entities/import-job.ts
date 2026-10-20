import type { CourseId, ImportJobId, UserId } from '../types/branded.js';
import type { AIConfidenceLevel, EvidenceSource, ImportJobStatus } from '../enums/index.js';

export interface ImportJob {
  readonly id: ImportJobId;
  userId?: UserId;
  status: ImportJobStatus;
  sourcePath: string;
  sourceType: 'archive' | 'directory' | 'files';
  totalFiles: number;
  processedFiles: number;
  importedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  duplicateFiles: number;
  resultingCourseId?: CourseId;
  report?: ImportReport;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface ImportReport {
  filesDiscovered: ImportFileEntry[];
  filesImported: ImportFileEntry[];
  filesUnsupported: ImportFileEntry[];
  duplicates: DuplicateEntry[];
  failures: FailureEntry[];
  manualReviewRequired: ImportFileEntry[];
  aiSuggestions: AISuggestion[];
  securityIssues: SecurityIssue[];
}

export interface ImportFileEntry {
  originalPath: string;
  filename: string;
  mimeType?: string;
  fileSizeBytes: number;
  checksumSha256?: string;
  suggestedSection?: string;
  suggestedLesson?: string;
  status: 'imported' | 'skipped' | 'failed' | 'unsupported' | 'review';
  reason?: string;
}

export interface DuplicateEntry {
  originalPath: string;
  existingResourcePath: string;
  checksumSha256: string;
  action: 'reused' | 'skipped' | 'user_review';
}

export interface FailureEntry {
  originalPath: string;
  error: string;
  isRecoverable: boolean;
}

export interface AISuggestion {
  type: 'course_title' | 'section' | 'lesson' | 'ordering' | 'prerequisite' | 'description' | 'learning_objective';
  suggestion: string;
  confidence: AIConfidenceLevel;
  evidenceSource: EvidenceSource;
  evidenceDetail?: string;
}

export interface SecurityIssue {
  path: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
}
