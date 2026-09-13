const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function request(path, options = {}) {
  const token = localStorage.getItem('access_token');
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
  attendees: (id) => request(`/admin/events/${id}/attendees`),
  summary: () => request('/admin/reports/summary'),
};
