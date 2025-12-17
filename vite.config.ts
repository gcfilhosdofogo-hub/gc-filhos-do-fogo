import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss'; // Importa o plugin tailwindcss
import autoprefixer from 'autoprefixer'; // Importa o plugin autoprefixer

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      css: { // Configuração explícita do PostCSS
        postcss: {
          plugins: [
            tailwindcss(), // Usa o plugin tailwindcss
            autoprefixer(),
          ],
        },
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