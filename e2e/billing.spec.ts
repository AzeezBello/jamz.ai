import { expect, test } from '@playwright/test';
import { signUp } from './fixtures';

test.describe('billing', () => {
  test('the yearly toggle shows a real saving, not the monthly price', async ({ page }) => {
    await page.goto('/pricing');
    const proCard = page
      .locator('div')
      .filter({ hasText: /^Pro Plan/ })
      .first();

    const monthly = await proCard.getByText(/^\$\d/).first().innerText();
    await page.getByLabel('Bill yearly').click();
    const yearly = await proCard.getByText(/^\$\d/).first().innerText();

    // The prototype showed $8/month under both toggles while claiming savings.
    expect(yearly).not.toBe(monthly);
    await expect(proCard.getByText(/billed yearly — saves/)).toBeVisible();
  });

  test('subscribe sends an authenticated user to Stripe Checkout', async ({ page }) => {
    test.skip(
      !process.env.STRIPE_TEST_MODE,
      'Set STRIPE_TEST_MODE=1 with test-mode prices configured.',
    );

    await signUp(page);
    await page.goto('/pricing');
    await page.getByRole('button', { name: 'Subscribe' }).first().click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    expect(page.url()).toContain('checkout.stripe.com');
  });

  test('subscribe prompts an anonymous visitor to sign up first', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: 'Subscribe' }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Welcome to JAMZ');
  });
});
