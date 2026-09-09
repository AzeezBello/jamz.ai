import { expect, test } from '@playwright/test';
import { generateSong, readCredits, signUp } from './fixtures';

test.describe('cancellation', () => {
  test('cancelling stops the job and refunds the credits', async ({ page }) => {
    await signUp(page);
    const before = await readCredits(page);

    await generateSong(page, 'a long ambient drone for cancelling');

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Cancel and refund/ }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    // The old build closed the modal and let the job finish anyway, charging
    // the user and adding a song they had cancelled.
    await expect.poll(() => readCredits(page), { timeout: 30_000 }).toBe(before);

    await page.goto('/dashboard');
    await expect(page.getByText('Your library starts with one sentence')).toBeVisible();
  });

  test('closing the modal leaves the job running in the background', async ({ page }) => {
    await signUp(page);
    await generateSong(page, 'a background job that should still finish');

    await page.getByRole('button', { name: 'Run in background' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.goto('/dashboard');
    await expect(page.getByRole('table')).toContainText(/Background Job/i, { timeout: 90_000 });
  });
});
