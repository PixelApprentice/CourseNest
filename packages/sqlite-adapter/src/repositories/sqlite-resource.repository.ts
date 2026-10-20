import type { Resource, ResourceId } from '@coursenest/domain';
import type { IResourceRepository } from '@coursenest/database-contracts';
import type { ISqliteConnection } from '../database.js';

export class SqliteResourceRepository implements IResourceRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): Resource {
    return {
      id: row.id as ResourceId,
      originalFilename: row.original_filename,
      displayName: row.display_name,
      mimeType: row.mime_type,
      fileSizeBytes: row.file_size_bytes,
      checksumSha256: row.checksum_sha256,
      storagePath: row.storage_path,
      sourceDescription: row.source_description ?? undefined,
      resourceType: row.resource_type,
      resourceVersion: row.resource_version ?? undefined,
      isIndexed: Boolean(row.is_indexed),
      importedAt: row.imported_at,
      licenseInfo: row.license_info ?? undefined,
      duplicateOfResourceId: (row.duplicate_of_resource_id as ResourceId) ?? undefined,
    };
  }

  async findById(id: ResourceId): Promise<Resource | null> {
    const row = this.db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findByChecksum(checksumSha256: string): Promise<Resource | null> {
    const row = this.db.prepare('SELECT * FROM resources WHERE checksum_sha256 = ?').get(checksumSha256);
    return row ? this.mapRow(row) : null;
  }

  async findByIds(ids: ResourceId[]): Promise<Resource[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db.prepare(`SELECT * FROM resources WHERE id IN (${placeholders})`).all(...ids);
    return rows.map((r) => this.mapRow(r));
  }

  async create(resource: Resource): Promise<Resource> {
    this.db.prepare(`
      INSERT INTO resources (
        id, original_filename, display_name, mime_type, file_size_bytes,
        checksum_sha256, storage_path, source_description, resource_type,
        resource_version, is_indexed, imported_at, license_info, duplicate_of_resource_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resource.id,
      resource.originalFilename,
      resource.displayName,
      resource.mimeType,
      resource.fileSizeBytes,
      resource.checksumSha256,
      resource.storagePath,
      resource.sourceDescription ?? null,
      resource.resourceType,
      resource.resourceVersion ?? null,
      resource.isIndexed ? 1 : 0,
      resource.importedAt,
      resource.licenseInfo ?? null,
      resource.duplicateOfResourceId ?? null,
    );
    return resource;
  }

  async update(id: ResourceId, updates: Partial<Resource>): Promise<Resource> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Resource not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE resources SET
        original_filename = ?, display_name = ?, mime_type = ?, file_size_bytes = ?,
        checksum_sha256 = ?, storage_path = ?, source_description = ?, resource_type = ?,
        resource_version = ?, is_indexed = ?, imported_at = ?, license_info = ?, duplicate_of_resource_id = ?
      WHERE id = ?
    `).run(
      merged.originalFilename,
      merged.displayName,
      merged.mimeType,
      merged.fileSizeBytes,
      merged.checksumSha256,
      merged.storagePath,
      merged.sourceDescription ?? null,
      merged.resourceType,
      merged.resourceVersion ?? null,
      merged.isIndexed ? 1 : 0,
      merged.importedAt,
      merged.licenseInfo ?? null,
      merged.duplicateOfResourceId ?? null,
      id,
    );
    return merged;
  }

  async delete(id: ResourceId): Promise<void> {
    this.db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  }

  async getStorageUsageBytes(): Promise<number> {
    const row = this.db.prepare('SELECT SUM(file_size_bytes) as total FROM resources').get() as { total: number | null };
    return row.total ?? 0;
  }
}
