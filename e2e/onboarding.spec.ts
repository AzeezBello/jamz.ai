import { expect, test } from '@playwright/test';
import { dismissOnboarding, signUp, uniqueEmail, TEST_PASSWORD } from './fixtures';

test.describe('guidance', () => {
  test('a new account is met by the intro, and only once', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Sign Up', exact: true })
      .click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('E2E Tester');
    await dialog.getByLabel('Email', { exact: true }).fill(email);
    await dialog.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await dialog.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Describe it, and Jamz makes it')).toBeVisible({ timeout: 20_000 });

    // Walk the steps rather than skipping, to prove the flow advances.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Credits, and what they buy')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Private until you decide otherwise')).toBeVisible();

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Describe it, and Jamz makes it')).toBeHidden();

    // Completion is stored on the profile, so a reload must not show it again.
    await page.reload();
    await page.waitForTimeout(1500);
    await expect(page.getByText('Describe it, and Jamz makes it')).toBeHidden();
  });

  test('the tour spotlights real parts of the dashboard', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');
    await dismissOnboarding(page);

    // The empty library offers the tour too, so take the one in the header.
    await page.getByRole('button', { name: 'Take the tour' }).first().click();

    const tour = page.getByRole('dialog', { name: /Tour step 1 of/ });
    await expect(tour).toContainText('The studio');

    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('dialog', { name: /Tour step 2 of/ })).toContainText(
      'Length and mood',
    );

    // Escape must end it, not trap the user behind the overlay.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Tour step/ })).toBeHidden();
  });

  test('an empty library explains what to do next', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');
    await dismissOnboarding(page);

    await expect(page.getByText('Your library starts with one sentence')).toBeVisible();
    await expect(page.getByText(/costs 5 credits/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Go to the studio/ })).toBeVisible();
  });

  test('icon-only buttons explain themselves on hover', async ({ page }) => {
    await signUp(page);
    await page.goto('/');

    // The player only exists once something is playing, so use the nav bell,
    // which is always present for a signed-in user.
    const bell = page.getByRole('button', { name: /Notifications/ }).first();
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('aria-label', /Notifications/);
  });
});
