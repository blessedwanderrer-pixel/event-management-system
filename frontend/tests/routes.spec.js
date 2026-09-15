import { test, expect } from '@playwright/test';

const publicRoutes = [
  ['/', 'Make room for'],
  ['/about', 'Built for real gatherings.'],
  ['/contact', 'We are easy to reach.'],
  ['/faq', 'Answers, kept short.'],
  ['/privacy-policy', 'Privacy Policy'],
  ['/terms', 'Terms & Conditions'],
  ['/login', 'Welcome back.'],
  ['/signup', 'Make yourself at home.'],
  ['/admin/login', 'Admin Login'],
  ['/forgot-password', 'Find your way back.'],
  ['/reset-password', 'Choose a new password.'],
  ['/auth/callback', 'Almost there.'],
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
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
});

test('admin entry route redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('event discovery loads live event data', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Nowshera Tech Meetup' })).toBeVisible();
  await expect(page.getByText(/spots left/).first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('published');
  await expect(page.getByRole('heading', { name: 'Nowshera Tech Meetup' })).toBeVisible();
});

test('mobile navigation has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('footer links are present on public pages', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Explore Events', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'About Us' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Contact Us' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'FAQ' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Terms & Conditions' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Create Account' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Admin Login', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Admin Login', exact: true })).toHaveAttribute('href', '/admin/login');
});

test('public navbar exposes explore and account links', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/events');
  await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  await expect(nav.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
  await expect(nav.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');
  await expect(nav.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
  await expect(nav.getByRole('link', { name: 'Create Account' })).toHaveAttribute('href', '/signup');
  await expect(nav.getByRole('link', { name: 'My Registrations' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Admin Dashboard' })).toHaveCount(0);
});

async function mockAuthSession(page, profile, { events = [] } = {}) {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { access_token: 'test-access', refresh_token: 'test-refresh' },
      }),
    });
  });
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profile),
    });
  });
  await page.route('**/auth/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out' }),
    });
  });
  await page.route('**/admin/reports/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_events: events.length,
        published_events: events.filter((e) => e.status === 'published').length,
        upcoming_events: events.filter((e) => e.status === 'published').length,
        total_registrations: 2,
        active_registrations: 2,
        available_places: 8,
        completed_events: 0,
        cancelled_events: 0,
      }),
    });
  });
  await page.route(/\/admin\/events\/?(?:\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000020',
          active_registrations: 0,
          available_spots: body.capacity,
          ...body,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(events),
    });
  });
  await page.route(/\/admin\/events\/[^/]+\/(publish|complete|cancel)$/, async (route) => {
    const match = route.request().url().match(/\/admin\/events\/([^/]+)\/(publish|complete|cancel)$/);
    const event = events.find((item) => item.id === match?.[1]) || events[0];
    const action = match?.[2];
    const nextStatus = action === 'publish' ? 'published' : action === 'complete' ? 'completed' : 'cancelled';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...event, status: nextStatus }),
    });
  });
  await page.route(/\/admin\/events\/[^/]+$/, async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...events[0], ...body }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(events[0] || {
        id: '00000000-0000-0000-0000-000000000010',
        title: 'Fallback Event',
        description: '',
        event_date: '2026-12-01',
        event_time: '18:00:00',
        location: 'Nowshera',
        capacity: 10,
        status: 'draft',
        active_registrations: 0,
        available_spots: 10,
      }),
    });
  });
  await page.route(/\/admin\/events\/[^/]+\/attendees(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-0000-0000-000000000099',
          full_name: 'Demo Attendee',
          email: 'demo@example.com',
          registration_status: 'active',
          registered_at: '2026-09-01T10:00:00Z',
        },
      ]),
    });
  });
  await page.route('**/events/**', async (route) => {
    if (route.request().url().includes('/admin/')) return route.fallback();
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
  await page.route('**/events/', async (route) => {
    if (route.request().url().includes('/admin/')) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

async function fillLogin(page, email = 'user@example.com') {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: 'Log in' }).click();
}

async function fillAdminLogin(page, email = 'admin@example.com') {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: 'Log in' }).click();
}

test('admin login redirects to admin dashboard', async ({ page }) => {
  await mockAuthSession(page, {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin.test@example.com',
    full_name: 'Admin Test',
    role: 'admin',
  }, {
    events: [{
      id: '00000000-0000-0000-0000-000000000010',
      title: 'Admin Dashboard Meetup',
      description: 'Dashboard fixture',
      event_date: '2026-12-01',
      event_time: '18:00:00',
      location: 'Nowshera',
      capacity: 10,
      status: 'draft',
      active_registrations: 0,
      available_spots: 10,
    }],
  });
  await fillAdminLogin(page, 'admin.test@example.com');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Event management' })).toBeVisible();
  await expect(page.getByRole('link', { name: '+ Create Event' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Attendees' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
});

test('attendee login redirects to events', async ({ page }) => {
  await mockAuthSession(page, {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'attendee.a@test.example',
    full_name: 'Attendee A',
    role: 'attendee',
  });
  await fillLogin(page, 'attendee.a@test.example');
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole('heading', { name: 'Find your next thing.' })).toBeVisible();
});

test('admin login preserves intended protected destination', async ({ page }) => {
  await mockAuthSession(page, {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin.test@example.com',
    full_name: 'Admin Test',
    role: 'admin',
  });
  await page.goto('/admin/reports');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel('Email address').fill('admin.test@example.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin\/reports$/);
});

test('attendee login does not follow admin intended destination', async ({ page }) => {
  await mockAuthSession(page, {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'attendee.a@test.example',
    full_name: 'Attendee A',
    role: 'attendee',
  });
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel('Email address').fill('attendee.a@test.example');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Administrator access required.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('admin dashboard create and publish controls work', async ({ page }) => {
  const draftEvent = {
    id: '00000000-0000-0000-0000-000000000010',
    title: 'Draft Launch Night',
    description: 'Admin fixture',
    event_date: '2026-12-15',
    event_time: '19:00:00',
    location: 'Nowshera Civic Hall',
    capacity: 40,
    status: 'draft',
    active_registrations: 0,
    available_spots: 40,
  };
  await mockAuthSession(page, {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin.test@example.com',
    full_name: 'Admin Test',
    role: 'admin',
  }, { events: [draftEvent] });

  await fillAdminLogin(page, 'admin.test@example.com');
  await expect(page.getByText('Draft Launch Night')).toBeVisible();

  await page.getByRole('link', { name: '+ Create Event' }).first().click();
  await expect(page).toHaveURL(/\/admin\/events\/new$/);
  await expect(page.getByRole('heading', { name: 'Create an event' })).toBeVisible();
  await page.getByLabel('Title').fill('New Admin Event');
  await page.getByLabel('Location').fill('Nowshera');
  await page.getByLabel('Date').fill('2026-12-20');
  await page.getByLabel('Time').fill('18:30');
  await page.getByLabel('Capacity').fill('25');
  await page.locator('textarea').fill('Created from dashboard test');
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Event published.')).toBeVisible();

  await page.getByRole('link', { name: 'View Attendees' }).click();
  await expect(page).toHaveURL(/\/admin\/events\/.+\/attendees$/);
  await expect(page.getByText('Demo Attendee')).toBeVisible();
  await page.getByRole('link', { name: '← Dashboard' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
});

test('attendee cannot see admin dashboard controls', async ({ page }) => {
  await mockAuthSession(page, {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'attendee.a@test.example',
    full_name: 'Attendee A',
    role: 'attendee',
  });
  await fillLogin(page, 'attendee.a@test.example');
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole('link', { name: 'Admin Dashboard' })).toHaveCount(0);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByRole('heading', { name: 'This room is for admins.' })).toBeVisible();
});
