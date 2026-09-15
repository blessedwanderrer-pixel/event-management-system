import { test, expect } from '@playwright/test';

const RATE_LIMIT_DETAIL = 'Too many attempts. Please wait a minute and try again.';
const EMAIL_RATE_LIMIT_DETAIL = 'Email delivery is temporarily rate-limited. Please wait a minute and try again.';

async function fillSignup(page, { name, email }) {
  await page.getByLabel(/^Full name$/i).fill(name);
  await page.getByLabel(/^Email address$/i).fill(email);
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill('VerifyPass123!');
  await passwords.nth(1).fill('VerifyPass123!');
}

test('signup rate-limit notice does not leak across independent browser sessions', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ detail: RATE_LIMIT_DETAIL }),
    });
  });

  await pageA.goto('/signup');
  await fillSignup(pageA, { name: 'User A', email: 'user.a.rate@example.com' });
  await pageA.getByRole('button', { name: 'Create account' }).click();
  await expect(pageA.getByText(RATE_LIMIT_DETAIL)).toBeVisible();

  await pageB.goto('/signup');
  await expect(pageB.getByRole('heading', { name: 'Sign up to Nowshera Events' })).toBeVisible();
  await expect(pageB.getByText(RATE_LIMIT_DETAIL)).toHaveCount(0);
  await expect(pageB.getByText(/rate-limited|Too many attempts/i)).toHaveCount(0);

  await pageB.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Account created. Please check your email to confirm your account before logging in.',
        session: null,
        requires_confirmation: true,
      }),
    });
  });

  await fillSignup(pageB, { name: 'User B', email: 'user.b.ok@example.com' });
  await pageB.getByRole('button', { name: 'Create account' }).click();
  await expect(pageB.getByText(/check your email/i)).toBeVisible();
  await expect(pageB.getByText(RATE_LIMIT_DETAIL)).toHaveCount(0);
  await expect(pageB.getByText(EMAIL_RATE_LIMIT_DETAIL)).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});

test('signup clears transient rate-limit error on refresh and navigation', async ({ page }) => {
  await page.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ detail: RATE_LIMIT_DETAIL }),
    });
  });

  await page.goto('/signup');
  await fillSignup(page, { name: 'Transient User', email: 'transient.user@example.com' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(RATE_LIMIT_DETAIL)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign up to Nowshera Events' })).toBeVisible();
  await expect(page.getByText(RATE_LIMIT_DETAIL)).toHaveCount(0);

  await page.route('**/auth/signup', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ detail: RATE_LIMIT_DETAIL }),
    });
  });
  await fillSignup(page, { name: 'Transient User', email: 'transient.user@example.com' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(RATE_LIMIT_DETAIL)).toBeVisible();

  await page.goto('/about');
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up to Nowshera Events' })).toBeVisible();
  await expect(page.getByText(RATE_LIMIT_DETAIL)).toHaveCount(0);
});
