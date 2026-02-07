// utils/api.ts

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is undefined in client bundle");
  return baseUrl.replace(/\/$/, "");
}

async function parseJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function getErrorMessage(body: unknown, fallback: string) {
  if (!body) return fallback;
  if (typeof body === "string" && body.trim().length > 0) return body.trim();
  if (typeof body === "object" && body !== null) {
    const maybeMsg =
      (body as { error?: unknown; message?: unknown }).error ??
      (body as { message?: unknown }).message;
    if (typeof maybeMsg === "string" && maybeMsg.trim().length > 0) return maybeMsg.trim();
  }
  return fallback;
}

/** ---------------------------
 *  Public (no-auth) endpoints
 *  --------------------------*/

export async function fetchChargers() {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/points`, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error: ${res.status} ${text}`);
  }

  return res.json();
}

export async function signIn(credentials: { email: string; password: string }) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message = getErrorMessage(body, `Sign-in failed (${res.status})`);
    throw new Error(message);
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token || typeof data.token !== "string") {
    throw new Error("Sign-in succeeded but token is missing in the response");
  }

  return data; // { token }
}

export async function signUp(payload: { email: string; password: string }) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message = getErrorMessage(body, `Sign-up failed (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}

/** ---------------------------
 *  Auth token utilities
 *  --------------------------*/

export class AuthError extends Error {
  name = "AuthError";
}
export const AUTH_CHANGED_EVENT = "auth-changed";
export const AUTH_TOKEN_KEY = "authToken";

/**
 * Reads token from sessionStorage first (non-remember),
 * then localStorage (remember me).
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken && sessionToken.trim().length > 0) return sessionToken;

  const localToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (localToken && localToken.trim().length > 0) return localToken;

  return null;
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

/**
 * Store token consistently with your SignInScreen behavior.
 */
export function setAuthToken(token: string, rememberMe: boolean) {
  if (typeof window === "undefined") return;

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  const other = rememberMe ? window.sessionStorage : window.localStorage;

  storage.setItem(AUTH_TOKEN_KEY, token);
  other.removeItem(AUTH_TOKEN_KEY);

  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** ---------------------------
 *  Internal fetch helper (supports auth)
 *  --------------------------*/

async function fetchJson(path: string, init?: RequestInit & { auth?: boolean }) {
  const baseUrl = getBaseUrl();
  const auth = init?.auth ?? false;

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getAuthToken();
    if (!token) throw new AuthError("You must be signed in to do that.");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Token missing/expired/invalid
      throw new AuthError("Your session expired. Please sign in again.");
    }
    const body = await parseJsonSafe(res);
    const message = getErrorMessage(body, `API request failed (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}

/** ---------------------------
 *  Authenticated endpoints
 *  --------------------------*/

export async function fetchCarOwnerships() {
  // If your backend is mounted elsewhere, change the path here
  return fetchJson("/car-ownership", { auth: true });
}
