// utils/api.ts

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is undefined in client bundle");
  return baseUrl.replace(/\/$/, "");
}

export async function fetchChargers() {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/points`, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error: ${res.status} ${text}`);
  }

  return res.json();
}
