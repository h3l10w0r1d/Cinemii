// Thin client for the CINEMII FastAPI backend.
// Handles the JWT: stores it, attaches it to authenticated requests, and
// exposes session helpers used across the app.

import { API_BASE } from "./config.js";

const TOKEN_KEY = "cinemii_token";
const USER_KEY = "cinemii_user";

// --- Session ---------------------------------------------------------------

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
}

export function isLoggedIn() {
    return Boolean(getToken());
}

export function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// --- Core request helper ----------------------------------------------------

async function request(path, { method = "GET", body, auth = false } = {}) {
    const headers = {};

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (auth) {
        const token = getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error("Cannot reach the server. Is the backend running?");
    }

    // If the token is rejected, drop the stale session.
    if (res.status === 401 && auth) {
        clearSession();
    }

    const text = await res.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!res.ok) {
        throw new Error(extractError(data, res.status));
    }

    return data;
}

function extractError(data, status) {
    const detail = data && data.detail ? data.detail : null;
    if (Array.isArray(detail)) {
        // Pydantic validation errors.
        return detail.map(d => d.msg).join(", ");
    }
    if (typeof detail === "string") return detail;
    return `Request failed (${status}).`;
}

// --- API surface ------------------------------------------------------------

export const api = {
    signup: (name, email, password) =>
        request("/api/auth/signup", { method: "POST", body: { name, email, password } }),

    login: (email, password) =>
        request("/api/auth/login", { method: "POST", body: { email, password } }),

    google: credential =>
        request("/api/auth/google", { method: "POST", body: { credential } }),

    me: () => request("/api/auth/me", { auth: true }),

    streamInfo: (mediaType, mediaId) =>
        request(`/api/stream/info/${mediaType}/${mediaId}`, { auth: isLoggedIn() }),

    getProgress: (mediaType, mediaId) =>
        request(`/api/watch-progress/${mediaType}/${mediaId}`, { auth: true }),

    saveProgress: progress =>
        request("/api/watch-progress", { method: "POST", body: progress, auth: true }),

    listFavorites: () => request("/api/favorites", { auth: true }),

    addFavorite: favorite =>
        request("/api/favorites", { method: "POST", body: favorite, auth: true }),

    removeFavorite: (mediaType, mediaId) =>
    request(`/api/favorites/${mediaType}/${mediaId}`, { method: "DELETE", auth: true }),

// Friends
listFriends: () =>
    request("/api/friends", { auth: true }),

searchUsers: (q) =>
    request(`/api/friends/search?q=${encodeURIComponent(q)}`, { auth: true }),

sendFriendRequest: (userId) =>
    request(`/api/friends/request/${userId}`, { method: "POST", auth: true }),

listFriendRequests: () =>
    request("/api/friends/requests", { auth: true }),

acceptFriendRequest: (id) =>
    request(`/api/friends/accept/${id}`, { method: "POST", auth: true }),

rejectFriendRequest: (id) =>
    request(`/api/friends/reject/${id}`, { method: "POST", auth: true }),

heartbeat: () =>
    request("/api/friends/heartbeat", { method: "POST", auth: true }),

// Messages
listMessages: (friendId) =>
    request(`/api/messages/${friendId}`, { auth: true }),

sendMessage: (friendId, text) =>
    request(`/api/messages/${friendId}`, {
        method: "POST",
        body: { text },
        auth: true,
    }),

listRooms: () =>
    request("/api/rooms"),
};
