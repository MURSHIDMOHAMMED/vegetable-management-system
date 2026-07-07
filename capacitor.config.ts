import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.murshid.vegetablemanagement',
  appName: 'veg',
  webDir: 'public',
  server: {
    url: 'https://vegetable-management-system-fbcw.vercel.app',
    cleartext: false
  }
};

export default config;