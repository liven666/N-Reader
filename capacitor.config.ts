import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liven666.nreader',
  appName: 'N-Reader',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
