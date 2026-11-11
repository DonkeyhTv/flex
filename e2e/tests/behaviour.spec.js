import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

test('moves through the plan with the arrow keys, and picks with Enter', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop concern');
  await signIn(page, 'Camille Martin');
  const first = page.locator('[data-desk][tabindex="0"]');
  await first.focus();
  const start = await first.getAttribute('data-desk');

  await page.keyboard.press('ArrowRight');
  const focused = page.locator('[data-desk]:focus');
  const next = await focused.getAttribute('data-desk');
  expect(next).not.toBe(start);
  // One tab stop for the whole plan: it follows the focus.
  await expect(page.locator('[data-desk][tabindex="0"]')).toHaveAttribute('data-desk', next);

  await page.keyboard.press('Enter');
  const code = next.replace('desk-', '').replace('-', '.');
  await expect(page.getByRole('heading', { level: 2, name: `Bureau ${code}` })).toBeVisible();
  await expect(focused).toHaveAttribute('aria-pressed', 'true');
});

test('the date strip is a radio group: arrows change the day', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop concern');
  await signIn(page, 'Camille Martin');
  const days = page.getByRole('radiogroup', { name: 'Jour' }).getByRole('radio');
  await days.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(days.nth(1)).toBeFocused();
  await expect(days.nth(1)).toHaveAttribute('aria-checked', 'true');
});

test('moves my own booking to another day from the team planning', async ({ page }) => {
  await signIn(page, 'Camille Martin');
  await page.getByRole('link', { name: 'Équipe' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Planning d’équipe' })).toBeVisible();

  const mine = page.locator('.week__me .slot--mine');
  if ((await mine.count()) === 0) {
    await page.getByRole('button', { name: 'Semaine suivante ›' }).click();
  }
  const chip = mine.first();
  const desk = await chip.locator('.slot__code').textContent();
  await chip.getByRole('button', { name: /Déplacer la réservation/ }).click();
  const target = page.getByRole('menuitem').first();
  const day = (await target.textContent()).trim();
  await target.click();

  // Either the desk was free that day and the booking moved with it, or it
  // was taken and Flex says so: both are right, a silent failure is not.
  const toast = page.locator('.toast').first();
  await expect(toast).toBeVisible();
  if (await toast.evaluate((el) => el.classList.contains('toast--error'))) {
    await expect(toast).toContainText(`Votre bureau ${desk} est déjà pris ce jour-là`);
  } else {
    await expect(toast).toContainText(`Réservation déplacée au ${day}`);
  }
});

test('the office manager takes a desk out of service and back', async ({ page }) => {
  await signIn(page, 'Sam Leclercq');
  await page.getByRole('link', { name: 'Bureaux' }).click();
  await expect(page.getByText('Taux d’occupation')).toBeVisible();

  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '2.22', exact: true }) });
  await row.getByRole('button', { name: 'Mettre hors service' }).click();
  await row.getByLabel('Raison').fill('Chaise cassée');
  await row.getByRole('button', { name: 'Confirmer' }).click();
  await expect(row).toContainText('Hors service');
  await expect(row).toContainText('Chaise cassée');

  await row.getByRole('button', { name: 'Remettre en service' }).click();
  await expect(row).toContainText('En service');
});

test('members do not see the office page', async ({ page }) => {
  await signIn(page, 'Camille Martin');
  await expect(page.getByRole('link', { name: 'Bureaux' })).toHaveCount(0);
  await page.goto('/fr/office');
  await expect(page.getByRole('heading', { level: 1, name: 'Réserver un bureau' })).toBeVisible();
});

test('speaks Dutch and English', async ({ page }) => {
  await page.goto('/nl/sign-in');
  await expect(page.getByRole('heading', { name: 'Aanmelden' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

  await signIn(page, 'Camille Martin', 'en');
  await expect(page.getByRole('heading', { level: 1, name: 'Book a desk' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My bookings' })).toBeVisible();
  // The language switch keeps the page.
  await page.getByRole('link', { name: 'Nederlands' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Een bureau reserveren' })).toBeVisible();
});

test('sends a signed-out visitor to sign in, and back where they were going', async ({ page }) => {
  await page.goto('/fr/team');
  await expect(page).toHaveURL(/\/fr\/sign-in\?back=%2Fteam/);
  await page.getByRole('button', { name: /Camille Martin/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Planning d’équipe' })).toBeVisible();
});

test('no page is wider than the screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'A phone-width concern');
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  await page.goto('/fr/sign-in');
  expect(await fits()).toBe(true);
  await signIn(page, 'Sam Leclercq');
  for (const [link, heading] of [
    ['Mes réservations', 'Mes réservations'],
    ['Équipe', 'Planning d’équipe'],
    ['Bureaux', 'Bureaux'],
    ['Réserver', 'Réserver un bureau'],
  ]) {
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(await fits(), `${heading} fits`).toBe(true);
  }
});
