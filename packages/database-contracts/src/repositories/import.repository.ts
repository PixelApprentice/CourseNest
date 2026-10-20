import type { ImportJob } from '@coursenest/domain';
import type { ImportJobId } from '@coursenest/domain';

export interface IImportJobRepository {
  findById(id: ImportJobId): Promise<ImportJob | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<ImportJob[]>;
  create(job: ImportJob): Promise<ImportJob>;
  update(id: ImportJobId, updates: Partial<ImportJob>): Promise<ImportJob>;
  getActiveJobs(): Promise<ImportJob[]>;
}
