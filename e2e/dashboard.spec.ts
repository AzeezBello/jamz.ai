import { expect, test } from '@playwright/test';
import { generateSong, signUp } from './fixtures';

/** Signs up and leaves one finished song in the library. */
async function withOneSong(page: import('@playwright/test').Page, prompt: string) {
  await signUp(page);
  await generateSong(page, prompt);
  await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
  await page.getByRole('button', { name: 'Open song page' }).click();
  await page.goto('/dashboard');
}

test.describe('dashboard', () => {
  test('library totals ignore the search box', async ({ page }) => {
    // The totals were summed from the loaded rows, so typing a search that
    // matched nothing dropped "Total songs" to zero.
    await withOneSong(page, 'a warm acoustic song about harvest time');

    const total = page.getByRole('group', { name: 'Total songs' });
    await expect(total).toContainText('1');

    await page.getByLabel('Search songs').fill('zzzz-no-such-song');
    await expect(page.getByText('Nothing matches those filters')).toBeVisible();
    await expect(total).toContainText('1');
  });

  test('lyrics survive generation and reach the song page', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');

    await page.getByLabel('Song concept').fill('a quiet lullaby for a long night');
    await page.getByLabel('Lyrics', { exact: true }).fill('hush now\nthe city is sleeping');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Open song page' }).click();

    await expect(page.getByRole('heading', { name: 'Lyrics' })).toBeVisible();
    await expect(page.getByText('the city is sleeping')).toBeVisible();
  });

  test('the composer carries a title, styles and settings through', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');

    await page.getByLabel('Song concept').fill('a patient song about waiting for a train');
    await page.getByLabel('Song title (optional)').fill('The 6:04');

    // Styles are chips over a comma-separated string.
    const styleInput = page.getByLabel('Add a style');
    await styleInput.fill('brushed drums');
    await styleInput.press('Enter');
    await expect(page.getByRole('button', { name: 'Remove style brushed drums' })).toBeVisible();

    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('is ready', { timeout: 90_000 });

    // The chosen title must win over one derived from the prompt.
    await expect(page.getByRole('dialog')).toContainText('The 6:04');
  });

  test('v5 is locked on the free plan', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');

    await page.getByLabel('Model version').click();
    const v5 = page.getByRole('option', { name: /v5/ });
    await expect(v5).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
  });

  test('a song can be renamed', async ({ page }) => {
    await withOneSong(page, 'a restless techno loop for midnight');

    await page
      .getByRole('button', { name: /More actions/ })
      .first()
      .click();
    await page.getByRole('menuitem', { name: 'Edit details' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Renamed In A Test');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('table')).toContainText('Renamed In A Test');
  });

  test('songs can be filed into a project and filtered by it', async ({ page }) => {
    await withOneSong(page, 'a hazy shoegaze wall of guitars');

    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByLabel('New project name').fill('Demos');
    await page.keyboard.press('Enter');

    const projects = page.getByRole('navigation', { name: 'Projects' });
    await expect(projects.getByRole('button', { name: /^Demos/ })).toBeVisible();

    // Select the song, then move it via the bulk bar.
    await page
      .getByRole('checkbox', { name: /^Select / })
      .first()
      .check();
    await page.getByRole('button', { name: 'Move to' }).click();
    await page.getByRole('menuitem', { name: 'Demos' }).click();

    await expect(projects.getByRole('button', { name: /^Demos/ })).toContainText('1');

    // Filtering by the project keeps the song; "All songs" still shows it too.
    await projects.getByRole('button', { name: /^Demos/ }).click();
    await expect(page.getByRole('table')).toContainText(/Hazy Shoegaze/i);
  });

  test('bulk publish changes visibility', async ({ page }) => {
    await withOneSong(page, 'a bright brass fanfare for a parade');

    await page
      .getByRole('checkbox', { name: /^Select / })
      .first()
      .check();
    await page.getByRole('button', { name: 'Make public' }).click();

    await expect(page.getByText(/Published 1 song/)).toBeVisible({ timeout: 30_000 });

    // The visibility filter is server-side, so this proves the row really moved.
    await page.getByLabel('Filter by visibility').click();
    await page.getByRole('option', { name: 'Public' }).click();
    await expect(page.getByRole('table')).toContainText(/Bright Brass Fanfare/i);
  });
});
