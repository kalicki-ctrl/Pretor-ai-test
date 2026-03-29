import { defineConfig } from 'vitest/config';
import path from 'path';

const root = process.cwd();

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['client/src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(root, 'client/src'),
      '@shared': path.resolve(root, 'shared'),
    },
  },
});
