import AdmZip from 'adm-zip';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { gunzip as gunzipCb } from 'node:zlib';
import { promisify } from 'util';
import { validateArchivePath } from './security.js';

const gunzip = promisify(gunzipCb);

export async function extractArchive(
  sourcePath: string,
  sandboxDir: string,
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void = () => {},
): Promise<string[]> {
  await mkdir(sandboxDir, { recursive: true });

  const ext = sourcePath.toLowerCase();
  const extractedFiles: string[] = [];

  if (ext.endsWith('.zip')) {
    await extractZipAdm(sourcePath, sandboxDir, extractedFiles, onProgress);
  } else if (ext.endsWith('.tar.gz') || ext.endsWith('.tgz')) {
    await extractTarGz(sourcePath, sandboxDir, extractedFiles, onProgress);
  } else {
    throw new Error(`Unsupported archive format: ${sourcePath}`);
  }

  return extractedFiles;
}

async function extractZipAdm(
  sourcePath: string,
  destDir: string,
  extractedFiles: string[],
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void,
): Promise<void> {
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
    const targetPath = path.join(destDir, entryName);
    await mkdir(path.dirname(targetPath), { recursive: true });

    const buffer = entry.getData();
    await writeFile(targetPath, buffer);

    extractedFiles.push(entryName);
    onProgress(entryName, 'completed');
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
