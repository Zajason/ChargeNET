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
    const maybeMsg = (body as { error?: unknown; message?: unknown }).error ??
      (body as { message?: unknown }).message;
    if (typeof maybeMsg === "string" && maybeMsg.trim().length > 0) return maybeMsg.trim();
  }
  return fallback;
}

export async function fetchChargers() {
  const baseUrl = getBaseUrl();
  // attach auth token if present so backend can mark `reserved_by_me`
  const token = typeof window !== "undefined"
    ? window.localStorage.getItem("authToken") ?? window.sessionStorage.getItem("authToken")
    : null;

  const headers: Record<string, string> = { "Accept": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}/points`, { cache: "no-store", headers });

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

  return data;
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

export async function reserveCharger(chargerId: string, minutes?: number) {
  const baseUrl = getBaseUrl();
  
  // Get token from localStorage or sessionStorage
  const token = typeof window !== "undefined"
    ? window.localStorage.getItem("authToken") ?? window.sessionStorage.getItem("authToken")
    : null;

  if (!token) {
    throw new Error("Authentication token not found. Please sign in again.");
  }

  const endpoint = minutes ? `${baseUrl}/reserve/${chargerId}/${minutes}` : `${baseUrl}/reserve/${chargerId}`;
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message = getErrorMessage(body, `Reservation failed (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}

export async function fetchCharger(id: string) {
  const baseUrl = getBaseUrl();
  const token = typeof window !== "undefined"
    ? window.localStorage.getItem("authToken") ?? window.sessionStorage.getItem("authToken")
    : null;

  const headers: Record<string, string> = { "Accept": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}/points/${id}`, { cache: "no-store", headers });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message = getErrorMessage(body, `Failed to fetch charger (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}

export async function cancelReservation(chargerId: string) {
  const baseUrl = getBaseUrl();
  const token = typeof window !== "undefined"
    ? window.localStorage.getItem("authToken") ?? window.sessionStorage.getItem("authToken")
    : null;

  if (!token) throw new Error("Authentication token not found. Please sign in again.");

  const res = await fetch(`${baseUrl}/reserve/${chargerId}/cancel`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message = getErrorMessage(body, `Cancel failed (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}
