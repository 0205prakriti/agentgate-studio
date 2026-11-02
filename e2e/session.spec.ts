import { expect, test } from '@playwright/test';

const model = process.env.AGENTGATE_E2E_MODEL;

test('project → real model session → streamed answer persists', async ({
  page,
}) => {
  test.skip(!model, 'Set AGENTGATE_E2E_MODEL to an installed Ollama model.');
  await page.goto('/');
  await page.getByLabel('Project name').fill('E2E project');
  await page.getByRole('button', { name: /Create project/ }).click();
  await expect(
    page.getByRole('heading', { name: 'E2E project' }),
  ).toBeVisible();

  await page.getByLabel('Local model (Ollama)').selectOption(model as string);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(
    page.getByRole('heading', { name: 'Agent session' }),
  ).toBeVisible();

  await page
    .getByLabel('Task')
    .fill('Reply with one short sentence about the sea.');
  await page.getByRole('button', { name: 'Run task' }).click();
  const answer = page
    .getByRole('list', { name: 'Conversation' })
    .getByRole('listitem')
    .nth(1);
  await expect(answer).toContainText('Model', { timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeHidden({
    timeout: 90_000,
  });

  await page.reload();
  const turns = page
    .getByRole('list', { name: 'Conversation' })
    .getByRole('listitem');
  await expect(turns).toHaveCount(2);
  await expect(turns.nth(0)).toContainText('sea');
  expect(
    (await turns.nth(1).innerText()).replace('MODEL', '').trim().length,
  ).toBeGreaterThan(0);
});

test('disconnected model service shows an actionable error', async ({
  page,
}) => {
  test.skip(Boolean(model), 'Only meaningful when Ollama is not provided.');
  await page.goto('/');
  await page.getByLabel('Project name').fill('Offline');
  await page.getByRole('button', { name: /Create project/ }).click();
  await expect(page.getByText(/Ollama is not reachable/)).toContainText(
    'ollama serve',
  );
});
