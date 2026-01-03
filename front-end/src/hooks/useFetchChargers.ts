"use client";
import { useEffect, useState } from "react";
import type { Charger } from "../types/charger.ts";
import { fetchChargers } from "../utils/api";

export function useFetchChargers() {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchChargers();
        setChargers(data.points);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { chargers, loading, error };
}