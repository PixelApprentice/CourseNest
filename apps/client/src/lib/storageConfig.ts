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
  const electron = (window as any).electron || (window as any).__ELECTRON__;
  if (electron?.storage?.setExternalMountPath) {
    electron.storage.setExternalMountPath(path).catch?.(() => {});
  }
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
  const vaultEntries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key !== SAFETY_BACKUP_KEY) {
      const val = localStorage.getItem(key);
      if (val !== null) vaultEntries[key] = val;
    }
  }

  const payload = {
    backupTimestamp: new Date().toISOString(),
    vaultData: vaultEntries,
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

    // Auto-detect physical external drives when plugged in or removed in desktop runtime
    const electron = (window as any).electron || (window as any).__ELECTRON__;
    let unsubMounts: (() => void) | undefined;

    // Check attached real drives immediately on mount
    if (electron?.storage?.listVolumes) {
      electron.storage.listVolumes().then((vols: any[]) => {
        if (Array.isArray(vols) && vols.length > 0) {
          const current = getStorageConfig();
          const ext = vols.find(
            (v: any) =>
              v.isRemovable ||
              v.mountPath.startsWith('/run/media') ||
              v.mountPath.startsWith('/media') ||
              v.mountPath.startsWith('/mnt')
          );
          if (ext && (current.externalMountPath === '/media/usb-drive/coursenest_media' || !current.externalMountPath)) {
            current.externalMountPath = ext.mountPath;
            current.isMounted = true;
            saveStorageConfig(current);
            setConfig(current);
          }
        }
      }).catch?.(() => {});
    }

    if (electron?.storage?.onMountsChanged) {
      unsubMounts = electron.storage.onMountsChanged(async () => {
        try {
          const current = getStorageConfig();
          if (electron.storage.listVolumes) {
            const vols = await electron.storage.listVolumes();
            const extVol = vols.find(
              (v: any) =>
                v.isRemovable ||
                v.mountPath.startsWith('/run/media') ||
                v.mountPath.startsWith('/media') ||
                v.mountPath.startsWith('/mnt') ||
                (current.externalMountPath && v.mountPath === current.externalMountPath)
            );
            if (extVol) {
              if (current.externalMountPath !== extVol.mountPath && current.volumeType === 'external') {
                current.externalMountPath = extVol.mountPath;
              }
              if (!current.isMounted) {
                toggleMountStatus(true);
              }
            } else if (current.volumeType === 'external' && current.isMounted) {
              toggleMountStatus(false);
            }
          }
          window.dispatchEvent(new Event('coursenest_storage_changed'));
          window.dispatchEvent(new Event('coursenest_vault_updated'));
        } catch {}
      });
    }

    return () => {
      window.removeEventListener('coursenest_storage_changed', handler);
      if (unsubMounts) unsubMounts();
    };
  }, []);

  return { config, refresh };
}
