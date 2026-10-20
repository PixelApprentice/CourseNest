import { IMPORT_LIMITS } from '@coursenest/config';

export class SecurityValidationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SecurityValidationError';
  }
}

/**
 * Validate that an entry path inside an archive does not escape the destination directory.
 * Protects against Zip Slip directory traversal vulnerabilities.
 */
export function validateArchivePath(entryPath: string, _destinationDir?: string): string {
  // Normalize forward and back slashes
  const normalized = entryPath.replace(/\\/g, '/');

  // Reject paths containing parent navigation attempts
  if (normalized.includes('../') || normalized.startsWith('/')) {
    throw new SecurityValidationError(
      `Path traversal detected in archive entry: "${entryPath}"`,
      'PATH_TRAVERSAL_DETECTED',
    );
  }

  // Ensure path depth is bounded
  const depth = normalized.split('/').filter(Boolean).length;
  if (depth > IMPORT_LIMITS.maxPathDepth) {
    throw new SecurityValidationError(
      `Path depth exceeds maximum allowed (${depth} > ${IMPORT_LIMITS.maxPathDepth}): "${entryPath}"`,
      'PATH_DEPTH_EXCEEDED',
    );
  }

  return normalized;
}

/**
 * Validate file size against system limits.
 */
export function validateFileSize(sizeBytes: number, filename: string): void {
  if (sizeBytes > IMPORT_LIMITS.maxFileSizeBytes) {
    throw new SecurityValidationError(
      `File "${filename}" exceeds maximum file size limit (${sizeBytes} > ${IMPORT_LIMITS.maxFileSizeBytes} bytes)`,
      'FILE_SIZE_EXCEEDED',
    );
  }
}

/**
 * Validate total file count inside an archive or directory.
 */
export function validateFileCount(count: number): void {
  if (count > IMPORT_LIMITS.maxFileCount) {
    throw new SecurityValidationError(
      `Archive contains too many files (${count} > ${IMPORT_LIMITS.maxFileCount})`,
      'FILE_COUNT_EXCEEDED',
    );
  }
}

/**
 * Check compression ratio to prevent zip bombs.
 */
export function validateCompressionRatio(uncompressedSize: number, compressedSize: number): void {
  if (compressedSize <= 0) return;
  const ratio = uncompressedSize / compressedSize;
  if (ratio > IMPORT_LIMITS.maxCompressionRatio) {
    throw new SecurityValidationError(
      `Suspicious compression ratio detected (${ratio.toFixed(1)}:1 > ${IMPORT_LIMITS.maxCompressionRatio}:1) — possible zip bomb`,
      'ZIP_BOMB_DETECTED',
    );
  }
}
