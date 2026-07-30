import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.constantino.despesas',
  appName: 'Constantino',
  webDir: 'dist/frontend/browser',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F5F0E8',
    },
  },
};

export default config;
