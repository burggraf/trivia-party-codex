import { test, expect } from '@playwright/test';

test.describe('Pacing analytics lifecycle', () => {
  test('captures submission latency and purges after event completion', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /start game/i }).click();
    await page.getByRole('button', { name: /reveal question/i }).click();

    await expect(page.getByTestId('pacing-latency-chart')).toBeVisible();
    await expect(page.getByTestId('pacing-latency-chart')).toContainText('Average latency');

    await page.getByRole('button', { name: /end game/i }).click();
    await expect(page.getByText(/analytics cleared/i)).toBeVisible();
  });
});
