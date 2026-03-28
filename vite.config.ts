import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        manifest: {
          name: 'Filhos do Fogo - Capoeira',
          short_name: 'Filhos do Fogo',
          description: 'Humildade, Disciplina e União - Grupo de Capoeira',
          theme_color: '#1c1917',
          background_color: '#1c1917',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('react')) return 'react-core';
              return 'vendor';
            }
            if (id.includes('views/Dashboard')) {
              const name = id.split('Dashboard')[1].split('.')[0].toLowerCase();
              return `dash-${name}`;
            }
            if (id.includes('translations')) return 'i18n';
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      }
    }
  };
});
