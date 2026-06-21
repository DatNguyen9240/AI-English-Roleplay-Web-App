import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env.local (and .env) variables at build/dev time
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        // '@/types/audio' → 'src/types/audio'
        // '@/utils/logger' → 'src/utils/logger'
        // '@/features/...'  → 'src/features/...'
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: parseInt(env.VITE_DEV_PORT, 10),
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: env.VITE_API_URL,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
