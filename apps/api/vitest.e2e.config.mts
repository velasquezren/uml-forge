import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const rootEnv = path.resolve(__dirname, '../../.env');
if (existsSync(rootEnv)) {
  try {
    loadEnvFile(rootEnv);
  } catch {
    // Ya cargado
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts', 'test/**/*.e2e.test.ts'],
    exclude: ['node_modules/**/*', 'dist/**/*'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
