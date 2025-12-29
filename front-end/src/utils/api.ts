export async function fetchChargers() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${baseUrl}/points`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }
  
  export async function fetchChargerById(id: string | number) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${baseUrl}/points/${id}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }