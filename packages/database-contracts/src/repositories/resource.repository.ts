import type { Resource } from '@coursenest/domain';
import type { ResourceId } from '@coursenest/domain';

export interface IResourceRepository {
  findById(id: ResourceId): Promise<Resource | null>;
  findByChecksum(checksumSha256: string): Promise<Resource | null>;
  findByIds(ids: ResourceId[]): Promise<Resource[]>;
  create(resource: Resource): Promise<Resource>;
  update(id: ResourceId, updates: Partial<Resource>): Promise<Resource>;
  delete(id: ResourceId): Promise<void>;
  getStorageUsageBytes(): Promise<number>;
}
