import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: { '/api': { target: process.env.LUMEN_API_TARGET || 'http://127.0.0.1:8765', changeOrigin: false } },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/backend/data/**'] },
  },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'], react: ['react', 'react-dom'] } } } },
});
