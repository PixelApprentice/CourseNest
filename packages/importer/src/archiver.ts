import AdmZip from 'adm-zip';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import path from 'path';
import { gunzip as gunzipCb } from 'node:zlib';
import { promisify } from 'util';
import { validateArchivePath } from './security.js';
import { coursePasswordManager } from './coursePasswordManager.js';

const gunzip = promisify(gunzipCb);

export interface MultiArchiveExtractionResult {
  archivePath: string;
  archiveBaseName: string;
  files: string[];
  status: 'success' | 'partial' | 'error';
  error?: string;
}

export async function extractArchive(
  sourcePath: string,
  sandboxDir: string,
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void = () => {},
  password?: string,
): Promise<string[]> {
  await mkdir(sandboxDir, { recursive: true });

  const ext = sourcePath.toLowerCase();
  const extractedFiles: string[] = [];

  if (ext.endsWith('.zip')) {
    await extractZipAdm(sourcePath, sandboxDir, extractedFiles, onProgress, password);
  } else if (ext.endsWith('.tar.gz') || ext.endsWith('.tgz')) {
    await extractTarGz(sourcePath, sandboxDir, extractedFiles, onProgress);
  } else {
    throw new Error(`Unsupported archive format: ${sourcePath}`);
  }

  return extractedFiles;
}

/**
 * Extracts multiple archives belonging to one course (e.g. part1.zip, part2.zip, module1.zip).
 * Each archive is sandboxed safely. If one archive has a corrupt entry, others continue cleanly.
 * Reuses the course-level password across all parts.
 */
export async function extractMultipleArchives(
  sourcePaths: string[],
  sandboxDir: string,
  onProgress: (archiveName: string, file: string, status: 'extracting' | 'completed' | 'error') => void = () => {},
  passwords?: Record<string, string> | string,
  courseId?: string,
): Promise<MultiArchiveExtractionResult[]> {
  await mkdir(sandboxDir, { recursive: true });
  const results: MultiArchiveExtractionResult[] = [];

  for (const archivePath of sourcePaths) {
    const baseName = path.basename(archivePath, path.extname(archivePath));
    // Sandbox each archive in its own designated module folder
    const archiveDestDir = path.join(sandboxDir, baseName);
    const archiveFiles: string[] = [];
    const password = (typeof passwords === 'string'
      ? passwords
      : passwords?.[archivePath] || passwords?.[baseName] || (courseId ? coursePasswordManager.getSessionPassword(courseId) : undefined)) || undefined;

    try {
      await mkdir(archiveDestDir, { recursive: true });
      const files = await extractArchive(archivePath, archiveDestDir, (file, status) => {
        onProgress(baseName, file, status);
      }, password);

      results.push({
        archivePath,
        archiveBaseName: baseName,
        files: files.map((f) => path.join(baseName, f)),
        status: 'success',
      });
    } catch (err: any) {
      results.push({
        archivePath,
        archiveBaseName: baseName,
        files: archiveFiles.map((f) => path.join(baseName, f)),
        status: archiveFiles.length > 0 ? 'partial' : 'error',
        error: err.message ?? String(err),
      });
    }
  }

  return results;
}

async function extractZipAdm(
  sourcePath: string,
  destDir: string,
  extractedFiles: string[],
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void,
  password?: string,
): Promise<void> {
  const stagingDir = path.join(destDir, `.staging_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  await mkdir(stagingDir, { recursive: true });

  try {
    const zip = new AdmZip(sourcePath);
    const entries = zip.getEntries();

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName.replace(/\\/g, '/');

      // Strict Zip Slip path validation BEFORE extracting or writing
      try {
        validateArchivePath(entryName, destDir);
      } catch (err) {
        onProgress(entryName, 'error');
        throw err;
      }

      onProgress(entryName, 'extracting');
      const stagingTarget = path.join(stagingDir, entryName);
      await mkdir(path.dirname(stagingTarget), { recursive: true });

      let buffer: Buffer;
      try {
        buffer = password ? entry.getData(password) : entry.getData();
      } catch (err: any) {
        if (!password && (entry.header as any)?.flags & 1) {
          throw new Error(`Archive entry "${entryName}" is password-protected. Password required.`);
        }
        throw new Error(`Failed to decrypt "${entryName}": ${err?.message || 'Invalid password or corrupted entry'}`);
      }

      await writeFile(stagingTarget, buffer);
    }

    // Atomic promotion from stagingDir to destDir upon full success
    const entriesToPromote = zip.getEntries().filter((e) => !e.isDirectory);
    for (const entry of entriesToPromote) {
      const entryName = entry.entryName.replace(/\\/g, '/');
      const stagingTarget = path.join(stagingDir, entryName);
      const finalTarget = path.join(destDir, entryName);
      await mkdir(path.dirname(finalTarget), { recursive: true });
      try {
        await rename(stagingTarget, finalTarget);
      } catch {
        const content = await readFile(stagingTarget);
        await writeFile(finalTarget, content);
      }
      extractedFiles.push(entryName);
      onProgress(entryName, 'completed');
    }
  } finally {
    // Clean up staging directory
    try {
      const { rm } = await import('fs/promises');
      await rm(stagingDir, { recursive: true, force: true });
    } catch {}
  }
}

function computeTarFileEnd(offset: number, size: number): number {
  // tar: 1 header block (512 bytes) + ceil(size/512) data blocks
  const dataBlocks = Math.ceil(size / 512);
  return offset + 512 + dataBlocks * 512;
}

async function extractTarGz(
  sourcePath: string,
  destDir: string,
  extractedFiles: string[],
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void,
): Promise<void> {
  const raw = await readFile(sourcePath);
  const decompressed = await gunzip(raw);

  let offset = 0;
  while (offset + 512 <= decompressed.length) {
    const header = decompressed.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString('utf-8').replace(/\0+$/, '');
    if (!name || name === './') {
      offset = computeTarFileEnd(offset, 0);
      continue;
    }

    const sizeStr = header.subarray(124, 136).toString('utf-8').replace(/\0+$/, '').trim();
    const size = sizeStr ? parseInt(sizeStr, 8) : 0;
    const typeflag = String.fromCharCode(header[156] || 0);
    const normalized = name.replace(/\\/g, '/');

    if (typeflag === '5' || normalized.endsWith('/')) {
      const dirPath = path.join(destDir, normalized);
      await mkdir(dirPath, { recursive: true });
      offset = computeTarFileEnd(offset, 0);
      continue;
    }

    try {
      validateArchivePath(normalized, destDir);
    } catch (err) {
      onProgress(normalized, 'error');
      offset = computeTarFileEnd(offset, size);
      throw err;
    }

    onProgress(normalized, 'extracting');
    const targetPath = path.join(destDir, normalized);
    await mkdir(path.dirname(targetPath), { recursive: true });

    if (size > 0) {
      const contentStart = offset + 512;
      const contentEnd = contentStart + size;
      const content = decompressed.subarray(contentStart, contentEnd);
      await writeFile(targetPath, content);
    } else {
      await writeFile(targetPath, Buffer.alloc(0));
    }

    extractedFiles.push(normalized);
    onProgress(normalized, 'completed');
    offset = computeTarFileEnd(offset, size);
  }
}
