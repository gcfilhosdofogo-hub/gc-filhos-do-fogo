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
          registerType: 'autoUpdate',
          devOptions: {
            enabled: true,
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
                src: '/logo.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
              },
              {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
            ],
          },
          workbox: {
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
            manualChunks: {
              vendor: ['react', 'react-dom', '@supabase/supabase-js', 'lucide-react'],
            },
          },
        },
        chunkSizeWarningLimit: 800,
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        }
      }
    };
});
