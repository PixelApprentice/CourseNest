import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';

/**
 * Android platform adapter implementing client storage and native interaction.
 */
export class AndroidPlatformAdapter {
  readonly platform = 'capacitor' as const;

  /**
   * Check current network status for offline-first learning.
   */
  async isOnline(): Promise<boolean> {
    const status = await Network.getStatus();
    return status.connected;
  }

  /**
   * Subscribe to network changes.
   */
  async onNetworkChange(callback: (connected: boolean) => void): Promise<() => void> {
    const handle = await Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    });
    return () => handle.remove();
  }

  /**
   * Read file content from app-private data directory.
   */
  async readFile(path: string): Promise<string> {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return typeof result.data === 'string' ? result.data : '';
  }

  /**
   * Write file to app-private data directory safely.
   */
  async writeFile(path: string, data: string): Promise<void> {
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  }

  /**
   * Ensure directories exist.
   */
  async ensureDirectory(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      // Directory may already exist
    }
  }

  /**
   * Get device and platform info.
   */
  async getDeviceInfo() {
    const info = await Device.getInfo();
    return {
      model: info.model,
      platform: info.platform,
      osVersion: info.osVersion,
      manufacturer: info.manufacturer,
      isVirtual: info.isVirtual,
    };
  }

  /**
   * Key-value preferences for lightweight offline metadata.
   */
  async getPreference(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async setPreference(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async removePreference(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

export const androidAdapter = new AndroidPlatformAdapter();
