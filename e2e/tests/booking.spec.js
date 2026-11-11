import { expect, test } from '@playwright/test';
import { freeDesk, openLastDay, signIn } from './helpers.js';

test('books a free desk, finds it in My bookings, and cancels it', async ({ page }) => {
  await signIn(page, 'Camille Martin');
  await openLastDay(page);
  const { desk, code } = await freeDesk(page);

  await desk.click();
  await expect(page.getByRole('heading', { level: 2, name: `Bureau ${code}` })).toBeVisible();
  await page.getByRole('button', { name: 'Réserver ce bureau' }).click();
  await expect(page.locator('.toast').filter({ hasText: `Bureau ${code} réservé` })).toBeVisible();
  await expect(desk).toHaveClass(/desk--mine/);
  // The address keeps the day and the desk: a reload shows the same view.
  await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}.*desk=desk-/);

  await page.getByRole('link', { name: 'Mes réservations' }).click();
  const booking = page.locator('.booking').filter({ hasText: code });
  await expect(booking).toBeVisible();
  await booking.getByRole('button', { name: 'Annuler' }).click();
  await booking.getByRole('button', { name: 'Confirmer l’annulation' }).click();
  await expect(page.locator('.toast').filter({ hasText: `Réservation du bureau ${code} annulée` })).toBeVisible();
  await expect(booking).toBeHidden();
});

test("shows a colleague's booking without reloading", async ({ browser }) => {
  const camille = await (await browser.newContext()).newPage();
  const sam = await (await browser.newContext()).newPage();
  await signIn(camille, 'Camille Martin');
  await signIn(sam, 'Sam Leclercq');
  await openLastDay(camille);
  await openLastDay(sam);

  const { id, code } = await freeDesk(sam);
  await expect(camille.locator(`[data-desk="${id}"]`)).toHaveClass(/desk--free/);

  await sam.locator(`[data-desk="${id}"]`).click();
  await sam.getByRole('button', { name: 'Réserver ce bureau' }).click();
  await expect(sam.locator(`[data-desk="${id}"]`)).toHaveClass(/desk--mine/);

  // Server-sent events: Camille's plan changes on its own.
  await expect(camille.locator(`[data-desk="${id}"]`)).toHaveClass(/desk--full/);
  await expect(camille.locator(`[data-desk="${id}"]`)).toHaveAttribute('aria-label', new RegExp(`Bureau ${code}.*Sam Leclercq`));

  await sam.getByRole('button', { name: 'Annuler ma réservation' }).click();
  await expect(camille.locator(`[data-desk="${id}"]`)).toHaveClass(/desk--free/);
});

test('refuses a desk taken in the meantime, and says so', async ({ browser }) => {
  const first = await (await browser.newContext()).newPage();
  const second = await (await browser.newContext()).newPage();
  await signIn(first, 'Camille Martin');
  await signIn(second, 'Sam Leclercq');
  await openLastDay(first);
  await openLastDay(second);
  const { id } = await freeDesk(first);
  await first.locator(`[data-desk="${id}"]`).click();
  await second.locator(`[data-desk="${id}"]`).click();

  // The other page has not caught up yet: both see a free desk.
  await second.context().setOffline(true);
  await first.getByRole('button', { name: 'Réserver ce bureau' }).click();
  await expect(first.locator(`[data-desk="${id}"]`)).toHaveClass(/desk--mine/);
  await second.context().setOffline(false);
  await second.getByRole('button', { name: 'Réserver ce bureau' }).click();
  await expect(second.locator('.toast--error')).toContainText('Quelqu’un vient de réserver ce bureau');

  await first.getByRole('button', { name: 'Annuler ma réservation' }).click();
  await expect(first.locator(`[data-desk="${id}"]`)).toHaveClass(/desk--free/);
});

test('filters desks by equipment, and lists them for screen readers', async ({ page }) => {
  await signIn(page, 'Camille Martin');
  const filter = page.getByRole('group', { name: 'Équipement souhaité' }).getByRole('button', { name: 'Double écran' });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.desk--dimmed').first()).toBeVisible();

  await page.getByRole('button', { name: 'Liste' }).click();
  const rows = page.getByRole('table').getByRole('row');
  // Header row, then only the desks with dual screens.
  await expect(rows.nth(1)).toContainText('Double écran');
  expect(await page.getByRole('table').getByRole('row').filter({ hasNotText: 'Double écran' }).count()).toBe(1);
});
