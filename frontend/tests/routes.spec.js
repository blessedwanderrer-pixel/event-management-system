import { test, expect } from '@playwright/test';

const publicRoutes = [
  ['/', 'Make room for'],
  ['/login', 'Welcome back.'],
  ['/signup', 'Make yourself at home.'],
  ['/forgot-password', 'Find your way back.'],
  ['/reset-password', 'Choose a new password.'],
  ['/events', 'Find your next thing.'],
  ['/403', 'This room is for admins.'],
  ['/does-not-exist', 'Page not found.'],
];

for (const [route, heading] of publicRoutes) {
  test(`renders ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  });
}

test('protected attendee route redirects to login', async ({ page }) => {
  await page.goto('/my-registrations');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

test('protected admin route redirects to login', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('admin entry route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('event discovery loads live event data', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Nowshera Tech Meetup' })).toBeVisible();
  await expect(page.getByText(/spots left/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('published');
  await expect(page.getByRole('heading', { name: 'Nowshera Tech Meetup' })).toBeVisible();
});

test('mobile navigation has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
