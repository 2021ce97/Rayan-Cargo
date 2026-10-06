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
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'lucide-react',
      'recharts',
      'jspdf',
      'html2canvas-pro',
      'html2canvas',
      'html-to-image',
      'canvas-confetti'
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  plugins: [
    tailwindcss(),
    react(),
    expressPlugin()
  ]
});

