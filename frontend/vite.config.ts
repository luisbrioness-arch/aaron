import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // TBD: aún no hay dominio/hosting confirmado (ver DECISIONS.md D-04).
  // Si se despliega en subcarpeta en vez de subdominio, cambiar esto junto
  // con RewriteBase en public/.htaccess — mismo patrón que FERRIMIX/CRM.
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
