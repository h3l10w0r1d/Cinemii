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
  twofaBackupCodes:(code)                 => request('POST',  '/api/auth/2fa/backup-codes', { body: { code }, auth: true }),
  forgotPassword: (email)                 => request('POST',  '/api/auth/forgot-password',  { body: { email } }),
  resetPassword:  (token, new_password)   => request('POST',  '/api/auth/reset-password',   { body: { token, new_password } }),

  // TV episode tracking
  listEpisodes:   (tvId)                  => request('GET',   `/api/episodes/${tvId}`,      { auth: true }),
  markEpisode:    (tvId, s, e)            => request('POST',  `/api/episodes/${tvId}/${s}/${e}`,   { auth: true }),
  unmarkEpisode:  (tvId, s, e)            => request('DELETE',`/api/episodes/${tvId}/${s}/${e}`,   { auth: true }),

  // Social
  publicProfile:  (username)              => request('GET',   `/api/users/${username}`,     { auth: true }),
  follow:         (username)              => request('POST',  `/api/users/${username}/follow`,   { auth: true }),
  unfollow:       (username)              => request('DELETE',`/api/users/${username}/follow`,   { auth: true }),
  feed:           ()                      => request('GET',   '/api/feed',                  { auth: true }),

  streamInfo:     (type, id)              => request('GET',  `/api/stream/info/${type}/${id}`, { auth: true }),

  // Authorized playable source (gated by the licensing CMS). Throws on 403 when
  // the title isn't licensed — callers treat that as "no source".
  getStreamSource: (id, type = 'movie') => request('GET', `/api/stream/source/${id}?media_type=${encodeURIComponent(type)}`),

  // Public movie stream gate (spec shape). Returns 200 with { available, ... };
  // never throws on "not licensed" — `available:false` carries the message.
  getMovieStream: (id) => request('GET', `/api/stream/movie/${encodeURIComponent(id)}`),

  // Movie Sources CMS (admin only) — backend PROPOSES the magnets; the client
  // never types one. Flow: proposals -> pick -> confirm rights -> create.
  adminMovieSourceProposals: (tmdbId) => request('GET', `/api/admin/movie-sources/proposals?tmdb_id=${encodeURIComponent(tmdbId)}`, { auth: true }),
  adminListMovieSources:     ()          => request('GET',    '/api/admin/movie-sources',          { auth: true }),
  adminGetMovieSource:       (id)        => request('GET',    `/api/admin/movie-sources/${id}`,     { auth: true }),
  adminCreateMovieSource:    (data)      => request('POST',   '/api/admin/movie-sources',          { body: data, auth: true }),
  adminUpdateMovieSource:    (id, data)  => request('PUT',    `/api/admin/movie-sources/${id}`,     { body: data, auth: true }),
  adminDeactivateMovieSource:(id)        => request('PATCH',  `/api/admin/movie-sources/${id}/deactivate`, { auth: true }),
  adminDeleteMovieSource:    (id)        => request('DELETE', `/api/admin/movie-sources/${id}`,     { auth: true }),

  // Licensing CMS (admin only)
  adminListCatalog:   ()         => request('GET',    '/api/admin/catalog',          { auth: true }),
  adminListSources:   ()         => request('GET',    '/api/admin/catalog/sources',  { auth: true }),
  adminArchiveSearch: (q)        => request('GET',    `/api/admin/catalog/archive/search?q=${encodeURIComponent(q)}`, { auth: true }),
  adminArchiveFiles:  (id)       => request('GET',    `/api/admin/catalog/archive/files/${encodeURIComponent(id)}`,   { auth: true }),
  adminCreateCatalog: (data)     => request('POST',   '/api/admin/catalog',          { body: data, auth: true }),
  adminUpdateCatalog: (id, data) => request('PUT',    `/api/admin/catalog/${id}`,    { body: data, auth: true }),
  adminDeleteCatalog: (id)       => request('DELETE', `/api/admin/catalog/${id}`,    { auth: true }),

  getProgress:    (type, id)              => request('GET',  `/api/watch-progress/${type}/${id}`, { auth: true }),
  listProgress:   ()                      => request('GET',  '/api/watch-progress',               { auth: true }),
  saveProgress:   (data)                  => request('POST', '/api/watch-progress',                { body: data, auth: true }),

  listFavorites:  ()                      => request('GET',  '/api/favorites',                     { auth: true }),
  addFavorite:    (data)                  => request('POST', '/api/favorites',                      { body: data, auth: true }),
  removeFavorite: (type, id)              => request('DELETE', `/api/favorites/${type}/${id}`,      { auth: true }),
  // Watchlist
  listWatchlist:   ()         => request('GET',    '/api/watchlist',                { auth: true }),
  addWatchlist:    (data)     => request('POST',   '/api/watchlist',                { body: data, auth: true }),
  removeWatchlist: (type, id) => request('DELETE', `/api/watchlist/${type}/${id}`,  { auth: true }),

  // Friends
  listFriends:          ()        => request('GET',  '/api/friends',               { auth: true }),
  searchUsers:          (q)       => request('GET',  `/api/friends/search?q=${encodeURIComponent(q)}`, { auth: true }),
  sendFriendRequest:    (userId)  => request('POST', `/api/friends/request/${userId}`, { auth: true }),
  listFriendRequests:   ()        => request('GET',  '/api/friends/requests',      { auth: true }),
  acceptFriendRequest:  (id)      => request('POST', `/api/friends/accept/${id}`,  { auth: true }),
  rejectFriendRequest:  (id)      => request('POST', `/api/friends/reject/${id}`,  { auth: true }),

  // Reviews
  getReview:    (type, id) => request('GET',  `/api/reviews/${type}/${id}`, { auth: true }),
  saveReview:   (data)     => request('POST', '/api/reviews',               { body: data, auth: true }),
  deleteReview: (type, id) => request('DELETE', `/api/reviews/${type}/${id}`, { auth: true }),

  // Messages
listMessages: (friendId) => request('GET', `/api/messages/${friendId}`, { auth: true }),
sendMessage:  (friendId, text) => request('POST', `/api/messages/${friendId}`, { body: { text }, auth: true }),

  listRooms:      ()                      => request('GET',  '/api/rooms'),
};
