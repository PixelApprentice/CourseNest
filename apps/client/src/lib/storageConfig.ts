import { useState, useEffect } from 'react';
import { addLog } from './logger';

export interface StorageConfig {
  volumeType: 'internal' | 'external';
  externalMountPath: string;
  isMounted: boolean;
  totalDiskSpaceGB: number;
  freeDiskSpaceGB: number;
  autoBackupEnabled: boolean;
  backupSlotPath: string;
  lastBackupAt: string | null;
}

const STORAGE_CONFIG_KEY = 'coursenest_storage_config_v1';
const SAFETY_BACKUP_KEY = 'coursenest_safety_backup_snapshot_v1';

function getDefaultConfig(): StorageConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    volumeType: 'internal',
    externalMountPath: '/media/usb-drive/coursenest_media',
    isMounted: true,
    totalDiskSpaceGB: 512,
    freeDiskSpaceGB: 284,
    autoBackupEnabled: true,
    backupSlotPath: 'internal_vault_safety_snapshot',
    lastBackupAt: new Date().toISOString(),
  };
}

export function getStorageConfig(): StorageConfig {
  return getDefaultConfig();
}

export function saveStorageConfig(config: StorageConfig): void {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('coursenest_storage_changed'));
  } catch (err: any) {
    addLog('ERROR', 'STORAGE', 'Failed to update storage configuration', err.message);
  }
}

export function setVolumeType(type: 'internal' | 'external'): void {
  const current = getStorageConfig();
  current.volumeType = type;
  saveStorageConfig(current);
  addLog(
    'INFO',
    'STORAGE',
    `Active media volume switched to: ${type.toUpperCase()}`,
    type === 'external' ? `Mount path: ${current.externalMountPath}` : 'Sandboxed internal storage',
  );
}

export function setExternalMountPath(path: string): void {
  const current = getStorageConfig();
  current.externalMountPath = path;
  saveStorageConfig(current);
  addLog('INFO', 'STORAGE', `External mount directory configured: ${path}`);
}

export function toggleMountStatus(isMounted: boolean): void {
  const current = getStorageConfig();
  current.isMounted = isMounted;
  saveStorageConfig(current);

  if (!isMounted) {
    addLog(
      'WARN',
      'STORAGE',
      `External storage volume disconnected (${current.externalMountPath})`,
      'Media video playback disabled until volume is remounted. Notes and quiz progress remain preserved in internal storage.',
    );
  } else {
    addLog(
      'INFO',
      'STORAGE',
      `External storage volume remounted successfully (${current.externalMountPath})`,
      'Full video playback and media extraction restored.',
    );
  }
}

export function createSafetyBackup(): { success: boolean; timestamp: string; sizeBytes: number } {
  const payload = {
    backupTimestamp: new Date().toISOString(),
    vaultData: { ...localStorage },
  };

  const str = JSON.stringify(payload);
  try {
    localStorage.setItem(SAFETY_BACKUP_KEY, str);
    const config = getStorageConfig();
    config.lastBackupAt = payload.backupTimestamp;
    saveStorageConfig(config);

    addLog('INFO', 'STORAGE', 'Safety snapshot created successfully', `Size: ${(str.length / 1024).toFixed(1)} KB`);
    return { success: true, timestamp: payload.backupTimestamp, sizeBytes: str.length };
  } catch (err: any) {
    addLog('ERROR', 'STORAGE', 'Safety snapshot backup failed', err.message);
    return { success: false, timestamp: new Date().toISOString(), sizeBytes: 0 };
  }
}

export function useStorageConfig(): { config: StorageConfig; refresh: () => void } {
  const [config, setConfig] = useState<StorageConfig>(getStorageConfig);

  const refresh = () => setConfig(getStorageConfig());

  useEffect(() => {
    const handler = () => setConfig(getStorageConfig());
    window.addEventListener('coursenest_storage_changed', handler);
    return () => window.removeEventListener('coursenest_storage_changed', handler);
  }, []);

  return { config, refresh };
}
