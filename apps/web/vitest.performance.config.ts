import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/performance/**/*.test.ts'],
    reporters: 'default'
  }
});
