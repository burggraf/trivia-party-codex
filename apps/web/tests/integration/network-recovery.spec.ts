import { test, expect } from '@playwright/test';

test.describe('Realtime outage recovery', () => {
  test('auto pauses gameplay when realtime channel drops', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /start game/i }).click();
    await page.getByRole('button', { name: /simulate disconnect/i }).click();

    await expect(page.getByRole('alert', { name: /connection lost/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /resume game/i })).toBeDisabled();
  });
});
