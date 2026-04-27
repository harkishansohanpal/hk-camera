import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hkcamera.app',
  appName: 'HK Camera',
  webDir: 'dist',
  server: {
    url: 'https://harkishans-macbook-air.tailebae5d.ts.net',
    cleartext: false,
  },
  plugins: {
    Torch: {},
  },
};

export default config;
