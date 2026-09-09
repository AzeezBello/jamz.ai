import { expect, test } from '@playwright/test';
import { signUp } from './fixtures';

const PHONE = { width: 390, height: 844 };

test.describe('mobile', () => {
  test.use({ viewport: PHONE });

  test('every app route fits the screen', async ({ page }) => {
    await signUp(page);

    for (const path of ['/', '/dashboard', '/settings', '/billing', '/pricing']) {
      await page.goto(path);
      await page.waitForTimeout(800);
      // Horizontal overflow is the classic phone failure: content the user can
      // never scroll to, or a page that slides sideways.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });

  test('the app is navigable without a sidebar', async ({ page }) => {
    // Below md the sidebar is hidden, which previously left no route to
    // Library, Billing or Settings at all on a phone.
    await signUp(page);
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('navigation', { name: 'Studio mobile' });
    await expect(drawer).toBeVisible();

    await drawer.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL(/\/billing/);
    await expect(page.getByRole('heading', { name: 'Billing' }).first()).toBeVisible();
  });

  test('the account button is identifiable without its label', async ({ page }) => {
    // The name is hidden at this width, so the trigger would otherwise be
    // announced as a bare avatar letter.
    await signUp(page);
    await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
  });
});
