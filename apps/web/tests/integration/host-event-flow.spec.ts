import { test, expect } from '@playwright/test';

test.describe('Host live trivia journey', () => {
  test('host runs full event setup and gameplay flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /create trivia event/i })).toBeVisible();

    await page.getByLabel(/event name/i).fill('Sunday Trivia');
    await page.getByLabel(/rounds/i).fill('3');
    await page.getByLabel(/questions per round/i).fill('5');
    await page.getByRole('button', { name: /select categories/i }).click();
    await page.getByRole('option', { name: /science/i }).click();
    await page.getByRole('option', { name: /history/i }).click();
    await page.getByRole('button', { name: /save event/i }).click();

    await expect(page.getByText(/join code/i)).toBeVisible();
    await page.getByRole('button', { name: /start game/i }).click();

    await expect(page.getByRole('button', { name: /next question/i })).toBeVisible();
    await page.getByRole('button', { name: /next question/i }).click();
    await expect(page.getByText(/scores updated/i)).toBeVisible();
    await page.getByRole('button', { name: /end game/i }).click();
    await expect(page.getByText(/final standings/i)).toBeVisible();
  });
});
