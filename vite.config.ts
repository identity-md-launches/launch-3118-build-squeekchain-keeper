import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic' },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 650, rollupOptions: { onwarn(warning, warn) { if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return; warn(warning); } } },
});
