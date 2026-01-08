"use client";

import { useEffect, useState } from "react";
import type { Charger } from "../types/charger";
import { fetchChargers } from "../utils/api";

type ApiPoint = {
  pointid: number | string;
  lat: string | number;
  lon: string | number;
  status: string;
  cap: number;
  kwhprice?: number;

  name?: string;
  address?: string;
  providerName?: string;
  connectorType?: string; // "CCS" | "CHADEMO" | "TYPE2"
};

export function useFetchChargers() {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchChargers();
        const points: ApiPoint[] = data.points ?? [];

        const normalized: Charger[] = points.map((p) => ({
          id: String(p.pointid),
          lat: typeof p.lat === "string" ? parseFloat(p.lat) : p.lat,
          lng: typeof p.lon === "string" ? parseFloat(p.lon) : p.lon,

          status: (p.status ?? "available").toLowerCase() as Charger["status"],

          // ✅ extra fields you asked for
          name: p.name ?? "Unknown charger",
          address: p.address ?? "",
          connectorType: (p.connectorType ?? "TYPE2") as Charger["connectorType"],
          maxKW: p.cap,
          kwhprice: p.kwhprice ?? 0.25,
          providerName: p.providerName ?? "Unknown",
        }));

        setChargers(normalized);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load chargers");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { chargers, loading, error };
}
