const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveSession(session) {
  if (!session?.access_token) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  if (session.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function paramsFrom(source) {
  const params = {};
  source.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function readAuthParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = paramsFrom(new URLSearchParams(hash));
  const queryParams = paramsFrom(new URLSearchParams(window.location.search));
  return { ...queryParams, ...hashParams };
}

export function clearAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  ['access_token', 'refresh_token', 'expires_in', 'token_type', 'type', 'code', 'token_hash', 'token', 'error', 'error_code', 'error_description'].forEach((key) => {
    url.searchParams.delete(key);
  });
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

export function authLinkError(params) {
  const description = params.error_description || params.error || '';
  if (!description) return '';
  return decodeURIComponent(description.replace(/\+/g, ' '));
}
