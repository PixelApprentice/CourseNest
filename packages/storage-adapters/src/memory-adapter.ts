import type { IStorageAdapter, FileMetadata } from './contracts.js';

export class InMemoryStorageAdapter implements IStorageAdapter {
  private readonly storage = new Map<string, { data: Uint8Array; metadata: FileMetadata }>();

  async writeResource(relativePath: string, data: Uint8Array | ArrayBuffer): Promise<string> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const now = new Date().toISOString();
    this.storage.set(relativePath, {
      data: bytes,
      metadata: {
        sizeBytes: bytes.length,
        createdAt: now,
        modifiedAt: now,
      },
    });
    return relativePath;
  }

  async readResource(relativePath: string): Promise<Uint8Array> {
    const item = this.storage.get(relativePath);
    if (!item) {
      throw new Error(`Resource not found in memory: "${relativePath}"`);
    }
    return item.data;
  }

  async exists(relativePath: string): Promise<boolean> {
    return this.storage.has(relativePath);
  }

  async deleteResource(relativePath: string): Promise<void> {
    this.storage.delete(relativePath);
  }

  async getMetadata(relativePath: string): Promise<FileMetadata | null> {
    const item = this.storage.get(relativePath);
    return item ? item.metadata : null;
  }

  async computeChecksum(relativePath: string): Promise<string> {
    const item = this.storage.get(relativePath);
    if (!item) throw new Error(`Resource not found in memory: "${relativePath}"`);

    // Simple deterministic hash for memory adapter
    let hash = 0;
    for (let i = 0; i < item.data.length; i++) {
      hash = ((hash << 5) - hash + (item.data[i] ?? 0)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
