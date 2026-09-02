import { defineConfig, devices } from '@playwright/test';

/** Direcciones de la PWA y de la API; en CI pueden apuntar a otro sitio. */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  // Los ficheros llevan extension propia para que Vitest no los recoja.
  testMatch: '**/*.e2e.ts',
  timeout: 60000,
  expect: { timeout: 15000 },
  // Las pruebas comparten la base de datos: en paralelo se pisarian.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @uml-forge/api dev',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @uml-forge/web dev',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
