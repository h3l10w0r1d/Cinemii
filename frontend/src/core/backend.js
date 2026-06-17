import { API_BASE } from './config';

const TOKEN_KEY = 'cinemii_token';
const USER_KEY  = 'cinemii_user';

export const getToken  = ()  => localStorage.getItem(TOKEN_KEY);
export const getUser   = ()  => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
export const isLoggedIn = () => !!getToken();

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(method, path, { body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event('cinemii:logout'));
  }
  if (!res.ok) {
    let msg = `Server error ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) {
        msg = Array.isArray(data.detail)
          ? data.detail.map((e) => e.msg).join('; ')
          : String(data.detail);
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  signup:         (name, email, password) => request('POST', '/api/auth/signup',  { body: { name, email, password } }),
  login:          (email, password, otp_code) => request('POST', '/api/auth/login', { body: { email, password, otp_code } }),
  google:         (credential)            => request('POST', '/api/auth/google',  { body: { credential } }),
  me:             ()                      => request('GET',  '/api/auth/me',       { auth: true }),

  // Account / profile management
  updateProfile:  (data)                  => request('PATCH', '/api/auth/profile',         { body: data, auth: true }),
  changeEmail:    (new_email, password)   => request('POST',  '/api/auth/change-email',    { body: { new_email, password }, auth: true }),
  changePassword: (current_password, new_password) => request('POST', '/api/auth/change-password', { body: { current_password, new_password }, auth: true }),
  twofaSetup:     ()                      => request('POST',  '/api/auth/2fa/setup',        { auth: true }),
  twofaEnable:    (code)                  => request('POST',  '/api/auth/2fa/enable',       { body: { code }, auth: true }),
  twofaDisable:   (code)                  => request('POST',  '/api/auth/2fa/disable',      { body: { code }, auth: true }),
  deleteAccount:  (password)              => request('DELETE','/api/auth/account',          { body: { password }, auth: true }),

  streamInfo:     (type, id)              => request('GET',  `/api/stream/info/${type}/${id}`, { auth: true }),

  getProgress:    (type, id)              => request('GET',  `/api/watch-progress/${type}/${id}`, { auth: true }),
  listProgress:   ()                      => request('GET',  '/api/watch-progress',               { auth: true }),
  saveProgress:   (data)                  => request('POST', '/api/watch-progress',                { body: data, auth: true }),

  listFavorites:  ()                      => request('GET',  '/api/favorites',                     { auth: true }),
  addFavorite:    (data)                  => request('POST', '/api/favorites',                      { body: data, auth: true }),
  removeFavorite: (type, id)              => request('DELETE', `/api/favorites/${type}/${id}`,      { auth: true }),

  listRooms:      ()                      => request('GET',  '/api/rooms'),
};
