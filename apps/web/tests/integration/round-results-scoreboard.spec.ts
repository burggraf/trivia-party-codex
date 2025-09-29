import { test, expect } from '@playwright/test';

test.describe('Scoreboard presentation', () => {
  test('displays standings, ties, and highlights at round completion', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /view scoreboard/i }).click();

    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible();
    await expect(page.getByTestId('leaderboard-row-0')).toContainText('Team Lightning');
    await expect(page.getByTestId('leaderboard-row-0').getByTestId('delta')).toContainText('+2');
    await expect(page.getByTestId('leaderboard-row-1')).toContainText('Team Comet');
    await expect(page.getByTestId('ties-badge')).toHaveText(/multiple teams tied/i);
  });
});
