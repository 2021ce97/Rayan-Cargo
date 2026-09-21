import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import app from './src/server/app';

const expressPlugin = (): Plugin => ({
  name: 'express-api-plugin',
  configureServer(server) {
    server.middlewares.use(app);
  },
  configurePreviewServer(server) {
    server.middlewares.use(app);
  }
});

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  },
  plugins: [
    tailwindcss(),
    react(),
    expressPlugin()
  ]
});

