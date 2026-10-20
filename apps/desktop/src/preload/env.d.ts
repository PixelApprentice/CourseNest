import type { ElectronAPI } from './index';

declare global {
  interface Window {
    __ELECTRON__?: ElectronAPI;
  }
}

export {};
