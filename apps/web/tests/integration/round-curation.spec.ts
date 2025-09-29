import { test, expect } from '@playwright/test';

test.describe('Round curation workflow', () => {
  test('host removes question and receives replacement from same category', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /manage rounds/i }).click();
    await expect(page.getByText(/round 1/i)).toBeVisible();

    const firstQuestion = page.getByTestId('question-card-0');
    const firstCategory = await firstQuestion.getByTestId('category').innerText();

    await firstQuestion.getByRole('button', { name: /replace question/i }).click();
    await expect(firstQuestion.getByText(/fetching replacement/i)).toBeVisible();
    await expect(firstQuestion.getByTestId('category')).toHaveText(firstCategory);
    await expect(firstQuestion).not.toHaveText(/original question text/i);
  });
});
