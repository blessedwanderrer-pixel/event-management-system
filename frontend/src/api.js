import { clearSession, getAccessToken, getRefreshToken, saveSession } from './session';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = configuredApiUrl
  || (import.meta.env.DEV ? 'http://127.0.0.1:8001' : '/api');

let refreshInFlight = null;

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (response) => {
        let payload = null;
        try { payload = await response.json(); } catch { payload = null; }
        if (!response.ok || !payload?.session?.access_token) {
          clearSession();
          return false;
        }
        saveSession(payload.session);
        return true;
      })
      .catch(() => {
        clearSession();
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function request(path, options = {}, allowRefresh = true) {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (response.status === 401 && allowRefresh && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await refreshSession();
    if (refreshed) return request(path, options, false);
  }
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
  }
  return payload;
}

export const api = {
  events: () => request('/events/'),
  event: (id) => request(`/events/${id}`),
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data, token) => request('/auth/reset-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  }),
  verifyToken: (data) => request('/auth/verify', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  changeEmail: (data) => request('/auth/change-email', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }).catch(() => ({ message: 'Logged out' })),
  me: () => request('/auth/me'),
  registrations: () => request('/registrations/me'),
  register: (eventId) => request(`/registrations?event_id=${eventId}`, { method: 'POST' }),
  cancelRegistration: (id) => request(`/registrations/${id}/cancel`, { method: 'POST' }),
  profile: () => request('/profile/me'),
  updateProfile: (data) => request('/profile/me', { method: 'PATCH', body: JSON.stringify(data) }),
  adminEvents: () => request('/admin/events'),
  adminEvent: (id) => request(`/admin/events/${id}`),
  createEvent: (data) => request('/admin/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eventAction: (id, action) => request(`/admin/events/${id}/${action}`, { method: 'POST' }),
  attendees: (id, status = 'active') => request(`/admin/events/${id}/attendees?status_filter=${encodeURIComponent(status)}`),
  summary: () => request('/admin/reports/summary'),
};
