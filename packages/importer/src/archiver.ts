import AdmZip from 'adm-zip';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Buffer } from 'buffer';
import { promisify } from 'util';
import { validateArchivePath } from './security.js';

export async function extractArchive(
  sourcePath: string,
  sandboxDir: string,
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void = () => {},
): Promise<string[]> {
  await mkdir(sandboxDir, { recursive: true });

  const ext = sourcePath.slice(sourcePath.lastIndexOf('.')).toLowerCase();
  const extractedFiles: string[] = [];

  if (ext === '.zip') {
    await extractZipAdm(sourcePath, sandboxDir, extractedFiles, onProgress);
  } else if (ext === '.tar.gz' || ext === '.tgz') {
    await extractTarGz(sourcePath, sandboxDir, extractedFiles, onProgress);
  } else {
    throw new Error(`Unsupported archive format: ${ext}`);
  }

  return extractedFiles;
}

function extractZipAdm(
  sourcePath: string,
  destDir: string,
  extractedFiles: string[],
  onProgress: (file: string, status: 'extracting' | 'completed' | 'error') => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(sourcePath);
      zip.extractAllTo(destDir, true);

      // Read the extracted files and track them
      const entries = zip.getEntries();
      for (const entry of entries) {
        if (entry.isDirectory) continue;

        const normalized = entry.name.replace(/\\/g, '/');
        const relativePath = path.relative(destDir, entry.name).replace(/\\/g, '/');

        // Validate path against zip slip
        try {
          validateArchivePath(normalized, destDir);
        } catch {
          onProgress(relativePath, 'error');
          continue;
        }

        // Read the file content
        const data = entry.getData();
        const buffer = Buffer.from(data);
        const targetPath = path.join(destDir, normalized);

        mkdir(path.dirname(targetPath), { recursive: true }).then(() => {
          writeFile(targetPath, buffer)
            .then(() => {
              extractedFiles.push(relativePath);
              onProgress(relativePath, 'completed');
            })
            .catch((_err) => {
              onProgress(relativePath, 'error');
            });
        });
      }

      resolve();
    } catch (e) {
      reject(e);
    }
  });
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
  const gunzip = promisify(require('zlib').gunzip);
  const decompressed = await gunzip(raw);

  let offset = 0;
  while (offset + 512 <= decompressed.length) {
    const header = decompressed.slice(offset, offset + 512);
    const name = header.slice(0, 100).toString('utf-8').replace(/\0+$/, '');
    if (!name || name === './') {
      offset = computeTarFileEnd(offset, 0);
      continue;
    }

    const size = parseInt(header.slice(124, 136).toString('utf-8').replace(/\0+$/, ''), 8);
    const normalized = name.replace(/\\/g, '/');
    const targetPath = path.join(destDir, normalized);
    const relativePath = path.relative(destDir, targetPath).replace(/\\/g, '/');

    try {
      validateArchivePath(normalized, destDir);
    } catch {
      offset = computeTarFileEnd(offset, size);
      onProgress(normalized, 'error');
      continue;
    }

    mkdir(path.dirname(targetPath), { recursive: true }).then(() => {
      if (size > 0) {
        const contentStart = offset + 512;
        const contentEnd = contentStart + size;
        const content = decompressed.slice(contentStart, contentEnd);
        writeFile(targetPath, content)
          .then(() => {
            extractedFiles.push(relativePath);
            onProgress(relativePath, 'completed');
          })
          .catch((_err) => {
            onProgress(relativePath, 'error');
          });
      } else {
        onProgress(normalized, 'completed');
      }
    });

    offset = computeTarFileEnd(offset, size);
  }
}