import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
    react()
  ]
});

