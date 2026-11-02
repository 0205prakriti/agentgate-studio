import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const port = 3100;
const repoRoot = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // Local runs reuse installed Chrome; CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: `npm run start --workspace @agentgate/web -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    env: {
      AGENTGATE_DATA_DIR: mkdtempSync(join(tmpdir(), 'agentgate-e2e-')),
      AGENTGATE_DOCS_ROOT: join(repoRoot, 'fixtures', 'rag'),
    },
  },
});
