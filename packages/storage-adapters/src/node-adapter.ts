import { readFile, writeFile, unlink, stat, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import type { IStorageAdapter, FileMetadata } from './contracts.js';

export class NodeStorageAdapter implements IStorageAdapter {
  constructor(private readonly baseStorageDir: string) {}

  private resolvePath(relativePath: string): string {
    return join(this.baseStorageDir, relativePath);
  }

  async writeResource(relativePath: string, data: Uint8Array | ArrayBuffer): Promise<string> {
    const fullPath = this.resolvePath(relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    const buffer =
      data instanceof Uint8Array
        ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
        : Buffer.from(data);
    await writeFile(fullPath, buffer);
    return relativePath;
  }

  async readResource(relativePath: string): Promise<Uint8Array> {
    const fullPath = this.resolvePath(relativePath);
    const buffer = await readFile(fullPath);
    return new Uint8Array(buffer);
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(this.resolvePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async deleteResource(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolvePath(relativePath));
    } catch {
      // Ignore if already deleted
    }
  }

  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await stat(this.resolvePath(relativePath));
      return {
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async computeChecksum(relativePath: string): Promise<string> {
    const buffer = await readFile(this.resolvePath(relativePath));
    return createHash('sha256').update(buffer).digest('hex');
  }
}
