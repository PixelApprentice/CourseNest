import type { ResourceId } from '../types/branded.js';
import type { ResourceType } from '../enums/index.js';

export interface Resource {
  readonly id: ResourceId;
  originalFilename: string;
  displayName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  storagePath: string;
  sourceDescription?: string;
  resourceType: ResourceType;
  resourceVersion?: string;
  isIndexed: boolean;
  importedAt: string;
  licenseInfo?: string;
  duplicateOfResourceId?: ResourceId;
}
