import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const clientDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(clientDir, '..', 'server');
const reuse = !process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: serverDir,
      url: 'http://localhost:3000/health',
      reuseExistingServer: reuse,
      timeout: 180000,
    },
    {
      command: 'npm run dev -- --host localhost --port 5173',
      cwd: clientDir,
      url: 'http://localhost:5173/',
      reuseExistingServer: reuse,
      timeout: 180000,
    },
  ],
});
