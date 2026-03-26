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
    environment: 'node',
    environmentMatchGlobs: [
      [path.resolve(root, 'client/src/**/*.{ts,tsx}'), 'jsdom'],
    ],
    setupFiles: ['client/src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(root, 'client/src'),
      '@shared': path.resolve(root, 'shared'),
    },
  },
});
