import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coursenest.app',
  appName: 'CourseNest',
  webDir: '../client/dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Preferences: {
      group: 'coursenest',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
