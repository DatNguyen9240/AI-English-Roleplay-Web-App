import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env.local (and .env) variables at build/dev time
  // so we can reference them in the Vite config itself (e.g. proxy target)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
