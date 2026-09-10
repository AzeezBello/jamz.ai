import { expect, test, type Page } from '@playwright/test';
import { signUp } from './fixtures';

/**
 * Approximates the accessible name for interactive elements and returns any
 * that would be announced as nothing — or as a bare number, which is how the
 * song page's like button read before this existed.
 */
async function unnamedControls(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      'button, a[href], [role="button"], input:not([type="hidden"]), textarea, select',
    );

    for (const node of nodes) {
      // Ignore anything not actually presented to the user.
      if (node.closest('[aria-hidden="true"]') || !node.offsetParent) continue;

      const labelledBy = node.getAttribute('aria-labelledby');
      const labelled = labelledBy ? (document.getElementById(labelledBy)?.textContent ?? '') : '';
      const associated =
        node.id && document.querySelector(`label[for="${CSS.escape(node.id)}"]`)?.textContent;

      const name = (
        node.getAttribute('aria-label') ||
        labelled ||
        associated ||
        node.getAttribute('title') ||
        node.getAttribute('placeholder') ||
        node.textContent ||
        ''
      ).trim();

      if (!name) {
        problems.push(`<${node.tagName.toLowerCase()}> with no accessible name`);
      } else if (/^[\d.,KM\s]+$/.test(name)) {
        // A control named only by a number tells a screen-reader user nothing.
        problems.push(`<${node.tagName.toLowerCase()}> named only "${name}"`);
      }
    }
    return problems;
  });
}

test.describe('accessibility', () => {
  test('signed-out pages name every control', async ({ page }) => {
    for (const path of ['/', '/pricing', '/legal/terms']) {
      await page.goto(path);
      await page.waitForTimeout(900);
      const problems = await unnamedControls(page);
      expect(problems, `${path}: ${problems.join('; ')}`).toEqual([]);
    }
  });

  test('signed-in pages name every control', async ({ page }) => {
    await signUp(page);
    for (const path of ['/dashboard', '/settings', '/billing']) {
      await page.goto(path);
      await page.waitForTimeout(1200);
      const problems = await unnamedControls(page);
      expect(problems, `${path}: ${problems.join('; ')}`).toEqual([]);
    }
  });

  test('the page has one h1 and a skip link', async ({ page }) => {
    await signUp(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Skip to content/i })).toHaveCount(1);
    // Exactly one top-level heading per view keeps the outline meaningful.
    expect(await page.getByRole('heading', { level: 1 }).count()).toBe(1);
  });
});
