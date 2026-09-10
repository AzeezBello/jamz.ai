import { expect, test } from '@playwright/test';
import { generateSong, signUp } from './fixtures';

test.describe('favourites and creator pages', () => {
  test('liking a song puts it in favourites, unliking removes it', async ({ page }) => {
    await signUp(page);
    await generateSong(page, 'lighthouse keeper waltz');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Open song page' }).click();
    await page.waitForURL(/\/song\//);

    // Scope to the song page: the landing sections render Like buttons too.
    await page.getByRole('article').getByRole('button', { name: /^Like/ }).click();
    await page.goto('/dashboard?tab=favourites');
    await expect(page.getByRole('table')).toContainText(/Lighthouse Keeper/i);

    // Unliking has to remove it immediately, not on the next reload.
    await page
      .getByRole('button', { name: /^Unlike/ })
      .first()
      .click();
    await expect(page.getByText('Nothing saved yet')).toBeVisible({ timeout: 15_000 });
  });

  test('a creator page shows only public songs, to anyone', async ({ page, context }) => {
    await signUp(page);

    await page.goto('/settings');
    await page.getByLabel('Handle').fill(`creator${Date.now()}`);
    const handle = await page.getByLabel('Handle').inputValue();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 15_000 });

    await generateSong(page, 'harbour lantern nocturne');
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Open song page' }).click();

    // Private by default: the page should be empty until it is published.
    const visitor = await context.browser()!.newPage();
    await visitor.goto(`/u/${handle}`);
    await expect(visitor.getByText('Nothing public yet')).toBeVisible();

    await page.goto('/dashboard');
    await page
      .getByRole('button', { name: /More actions/ })
      .first()
      .click();
    await page.getByRole('menuitemradio', { name: 'Public' }).click();

    await visitor.reload();
    await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(visitor.getByText(/Harbour Lantern/i)).toBeVisible({ timeout: 15_000 });
    await visitor.close();
  });
});
