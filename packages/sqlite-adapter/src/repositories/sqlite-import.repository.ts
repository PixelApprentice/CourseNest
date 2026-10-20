import type { ImportJob, ImportJobId, UserId, CourseId } from '@coursenest/domain';
import type { IImportJobRepository } from '@coursenest/database-contracts';
import type { ISqliteConnection } from '../database.js';

export class SqliteImportJobRepository implements IImportJobRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): ImportJob {
    return {
      id: row.id as ImportJobId,
      userId: (row.user_id as UserId) ?? undefined,
      status: row.status,
      sourcePath: row.source_path,
      sourceType: row.source_type,
      totalFiles: row.total_files,
      processedFiles: row.processed_files,
      importedFiles: row.imported_files,
      skippedFiles: row.skipped_files,
      failedFiles: row.failed_files,
      duplicateFiles: row.duplicate_files,
      resultingCourseId: (row.resulting_course_id as CourseId) ?? undefined,
      report: row.report_json ? JSON.parse(row.report_json) : undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      error: row.error ?? undefined,
    };
  }

  async findById(id: ImportJobId): Promise<ImportJob | null> {
    const row = this.db.prepare('SELECT * FROM import_jobs WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<ImportJob[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const rows = this.db.prepare('SELECT * FROM import_jobs ORDER BY started_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    return rows.map((r) => this.mapRow(r));
  }

  async create(job: ImportJob): Promise<ImportJob> {
    this.db.prepare(`
      INSERT INTO import_jobs (
        id, user_id, status, source_path, source_type, total_files,
        processed_files, imported_files, skipped_files, failed_files,
        duplicate_files, resulting_course_id, report_json, started_at,
        completed_at, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.userId ?? null,
      job.status,
      job.sourcePath,
      job.sourceType,
      job.totalFiles,
      job.processedFiles,
      job.importedFiles,
      job.skippedFiles,
      job.failedFiles,
      job.duplicateFiles,
      job.resultingCourseId ?? null,
      job.report ? JSON.stringify(job.report) : null,
      job.startedAt,
      job.completedAt ?? null,
      job.error ?? null,
    );
    return job;
  }

  async update(id: ImportJobId, updates: Partial<ImportJob>): Promise<ImportJob> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`ImportJob not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE import_jobs SET
        status = ?, total_files = ?, processed_files = ?, imported_files = ?,
        skipped_files = ?, failed_files = ?, duplicate_files = ?,
        resulting_course_id = ?, report_json = ?, completed_at = ?, error = ?
      WHERE id = ?
    `).run(
      merged.status,
      merged.totalFiles,
      merged.processedFiles,
      merged.importedFiles,
      merged.skippedFiles,
      merged.failedFiles,
      merged.duplicateFiles,
      merged.resultingCourseId ?? null,
      merged.report ? JSON.stringify(merged.report) : null,
      merged.completedAt ?? null,
      merged.error ?? null,
      id,
    );
    return merged;
  }

  async getActiveJobs(): Promise<ImportJob[]> {
    const rows = this.db.prepare(`
      SELECT * FROM import_jobs 
      WHERE status NOT IN ('completed', 'failed', 'cancelled')
      ORDER BY started_at ASC
    `).all();
    return rows.map((r) => this.mapRow(r));
  }
}
