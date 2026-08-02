/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          'genlayer-sdk': ['genlayer-js'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    include: ['src/tests/**/*.test.{ts,tsx}'],
  },
});
