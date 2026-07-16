// vite.config.js
import { defineConfig, loadEnv } from "file:///D:/AI%20English%20Roleplay%20Web%20App/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/AI%20English%20Roleplay%20Web%20App/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///D:/AI%20English%20Roleplay%20Web%20App/frontend/vite.config.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        // '@/types/audio' → 'src/types/audio'
        // '@/utils/logger' → 'src/utils/logger'
        // '@/features/...'  → 'src/features/...'
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
      }
    },
    server: {
      port: parseInt(env.VITE_DEV_PORT, 10),
      host: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false
        },
        "/socket.io": {
          target: env.VITE_API_URL,
          ws: true,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxBSSBFbmdsaXNoIFJvbGVwbGF5IFdlYiBBcHBcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEFJIEVuZ2xpc2ggUm9sZXBsYXkgV2ViIEFwcFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQUklMjBFbmdsaXNoJTIwUm9sZXBsYXklMjBXZWIlMjBBcHAvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gTG9hZCAuZW52LmxvY2FsIChhbmQgLmVudikgdmFyaWFibGVzIGF0IGJ1aWxkL2RldiB0aW1lXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW3JlYWN0KCldLFxuXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgLy8gJ0AvdHlwZXMvYXVkaW8nIFx1MjE5MiAnc3JjL3R5cGVzL2F1ZGlvJ1xuICAgICAgICAvLyAnQC91dGlscy9sb2dnZXInIFx1MjE5MiAnc3JjL3V0aWxzL2xvZ2dlcidcbiAgICAgICAgLy8gJ0AvZmVhdHVyZXMvLi4uJyAgXHUyMTkyICdzcmMvZmVhdHVyZXMvLi4uJ1xuICAgICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogcGFyc2VJbnQoZW52LlZJVEVfREVWX1BPUlQsIDEwKSxcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQSV9VUkwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfQVBJX1VSTCxcbiAgICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxVCxTQUFTLGNBQWMsZUFBZTtBQUMzVixPQUFPLFdBQVc7QUFDbEIsU0FBUyxxQkFBcUI7QUFGNkosSUFBTSwyQ0FBMkM7QUFLNU8sSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFFeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRTNDLFNBQU87QUFBQSxJQUNMLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUVqQixTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLE1BQ3REO0FBQUEsSUFDRjtBQUFBLElBRUEsUUFBUTtBQUFBLE1BQ04sTUFBTSxTQUFTLElBQUksZUFBZSxFQUFFO0FBQUEsTUFDcEMsTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUSxJQUFJO0FBQUEsVUFDWixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLFFBQ0EsY0FBYztBQUFBLFVBQ1osUUFBUSxJQUFJO0FBQUEsVUFDWixJQUFJO0FBQUEsVUFDSixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
