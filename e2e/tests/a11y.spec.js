import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

const audit = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
};

for (const colorScheme of ['light', 'dark']) {
  test.describe(`WCAG 2.2 AA, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('sign-in page', async ({ page }) => {
      await page.goto('/fr/sign-in');
      await expect(page.getByRole('button', { name: /Camille Martin/ })).toBeVisible();
      await audit(page);
    });

    test('booking page, with a desk selected and as a list', async ({ page }) => {
      await signIn(page, 'Camille Martin');
      await page.locator('[data-desk]').nth(3).click();
      await expect(page.getByRole('heading', { level: 2, name: /Bureau/ })).toBeVisible();
      await audit(page);
      await page.getByRole('button', { name: 'Liste' }).click();
      await audit(page);
    });

    test('my bookings and team planning', async ({ page }) => {
      await signIn(page, 'Camille Martin');
      await page.getByRole('link', { name: 'Mes réservations' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Mes réservations' })).toBeVisible();
      await audit(page);
      await page.getByRole('link', { name: 'Équipe' }).click();
      await expect(page.locator('.week')).toBeVisible();
      await audit(page);
    });

    test('office page', async ({ page }) => {
      await signIn(page, 'Sam Leclercq');
      await page.getByRole('link', { name: 'Bureaux' }).click();
      await expect(page.getByText('Taux d’occupation')).toBeVisible();
      await audit(page);
    });
  });
}
