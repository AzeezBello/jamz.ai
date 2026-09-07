import { expect, test } from '@playwright/test';
import { generateSong, readCredits, signUp } from './fixtures';

test.describe('generation', () => {
  test('generates a song, plays it, and offers a download', async ({ page }) => {
    await signUp(page);
    const before = await readCredits(page);

    await generateSong(page, 'an upbeat summer pop song about the sea');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('is ready', { timeout: 90_000 });

    await dialog.getByRole('button', { name: 'Play it' }).click();

    // Real playback: the element must actually advance past zero.
    await expect
      .poll(async () => page.evaluate(() => document.querySelector('audio')?.currentTime ?? 0), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download this song' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.(wav|mp3)$/);

    expect(await readCredits(page)).toBe(before - 5);
  });

  test('a generated song appears in the library', async ({ page }) => {
    await signUp(page);
    await generateSong(page, 'a slow piano ballad about winter');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });

    await page.goto('/dashboard');
    await expect(
      page
        .getByRole('cell')
        .filter({ hasText: /Piano Ballad|Winter/i })
        .first(),
    ).toBeVisible();
  });
});
