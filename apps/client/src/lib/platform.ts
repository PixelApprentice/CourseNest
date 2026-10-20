/**
 * Platform detection and adapter interface.
 * Used to abstract filesystem, database, and native API differences
 * between Electron and Capacitor.
 */

export type Platform = 'electron' | 'capacitor' | 'web';

export function detectPlatform(): Platform {
  if (typeof window !== 'undefined') {
    if ((window as unknown as Record<string, unknown>).__ELECTRON__) return 'electron';
    if ((window as unknown as Record<string, unknown>).Capacitor) return 'capacitor';
  }
  return 'web';
}

export interface PlatformAdapter {
  readonly platform: Platform;
  pickFiles(options?: { accept?: string[]; multiple?: boolean }): Promise<string[]>;
  pickDirectory(): Promise<string | null>;
  readFile(path: string): Promise<ArrayBuffer>;
  getDataDir(): Promise<string>;
  showNotification(title: string, body: string): Promise<void>;
}
