import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://api.seekids.net',
        changeOrigin: true,
        headers: {
          Origin: 'http://localhost:8080'
        }
      },
      '/auth': {
        target: 'https://api.seekids.net',
        changeOrigin: true,
        headers: {
          Origin: 'http://localhost:8080'
        }
      },
      '/socket.io': {
        target: 'https://api.seekids.net',
        changeOrigin: true,
        ws: true,
        headers: {
          Origin: 'https://api.seekids.net'
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
