export interface FileMetadata {
  sizeBytes: number;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Universal Storage Adapter Contract for storing and retrieving
 * managed course resources (videos, documents, images) across platforms.
 */
export interface IStorageAdapter {
  /**
   * Save a resource stream or buffer to managed storage.
   * Returns the relative storage path.
   */
  writeResource(relativePath: string, data: Uint8Array | ArrayBuffer): Promise<string>;

  /**
   * Read resource bytes from managed storage.
   */
  readResource(relativePath: string): Promise<Uint8Array>;

  /**
   * Check if a resource exists in storage.
   */
  exists(relativePath: string): Promise<boolean>;

  /**
   * Delete a managed resource.
   */
  deleteResource(relativePath: string): Promise<void>;

  /**
   * Get metadata for a stored resource.
   */
  getMetadata(relativePath: string): Promise<FileMetadata | null>;

  /**
   * Calculate SHA-256 hash of a stored resource.
   */
  computeChecksum(relativePath: string): Promise<string>;
}
