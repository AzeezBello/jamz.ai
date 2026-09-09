import { expect, test } from '@playwright/test';

test.describe('policies', () => {
  const policies = [
    ['terms', 'Terms of Service'],
    ['privacy', 'Privacy Policy'],
    ['ai-disclosure', 'AI Disclosure'],
  ] as const;

  for (const [slug, title] of policies) {
    test(`${slug} is readable without an account`, async ({ page }) => {
      await page.goto(`/legal/${slug}`);
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      await expect(page.getByText(/Last updated/)).toBeVisible();
    });
  }

  test('an unknown policy 404s rather than rendering blank', async ({ page }) => {
    await page.goto('/legal/not-a-policy');
    await expect(page.getByText('404')).toBeVisible();
  });

  test('the footer links to them, in-app', async ({ page }) => {
    await page.goto('/');
    const footerTerms = page.getByRole('link', { name: 'Terms', exact: true });
    await footerTerms.scrollIntoViewIfNeeded();
    await footerTerms.click();
    // In-app navigation, not a new tab.
    await expect(page).toHaveURL(/\/legal\/terms/);
  });

  test('signup consent links to what is being consented to', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Sign Up', exact: true })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('link', { name: 'terms' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'AI disclosure' })).toBeVisible();
  });
});
