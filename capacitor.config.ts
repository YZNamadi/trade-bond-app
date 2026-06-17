import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.techhaven.trustytrade',
  appName: 'TrustyTrade',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    url: 'https://techhaven.ng',
    androidScheme: 'https',
  },
};

export default config;
