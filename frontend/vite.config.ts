import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Dominio confirmado: aaron.hogartv.cl (subdominio propio, no subcarpeta).
  // base:'/' es correcto — no hay que cambiarlo.
  // Si algún día el sitio se mueve a subcarpeta, cambiar base Y RewriteBase
  // en frontend/public/.htaccess juntos (ver DECISIONS.md D-02).
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Requiere un servidor PHP local para el backend, ej.:
      //   php -S localhost:8000 -t ../api
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
