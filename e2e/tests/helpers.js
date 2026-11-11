import { expect } from '@playwright/test';

/** Signs in with a demo account, from the sign-in page of a language. */
export async function signIn(page, name, locale = 'fr') {
  await page.goto(`/${locale}/sign-in`);
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByRole('navigation', { name: /Navigation|navigatie|navigation/i })).toBeVisible();
}

/** Picks the last bookable day, the one the demo leaves emptiest, and waits for its plan. */
export async function openLastDay(page) {
  const day = page.getByRole('radiogroup', { name: 'Jour' }).getByRole('radio').last();
  await day.click();
  await expect(day).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.layout__plan')).toHaveAttribute('aria-busy', 'false');
  return day;
}

/** The first desk on the plan with both halves free. */
export async function freeDesk(page) {
  const desk = page.locator('.desk--free').first();
  const id = await desk.getAttribute('data-desk');
  const code = id.replace('desk-', '').replace('-', '.');
  return { desk: page.locator(`[data-desk="${id}"]`), id, code };
}
