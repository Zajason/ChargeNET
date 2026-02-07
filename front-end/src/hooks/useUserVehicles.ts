// hooks/useUserVehicles.ts
import { useEffect, useState } from "react";
import { fetchCarOwnerships, isLoggedIn, AuthError } from "../utils/api";
import type { CarOwnershipApi } from "../types/ownership";
import { ownershipToVehicle, type Vehicle } from "../utils/vehicleMapper";

export function useUserVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [hasNoCars, setHasNoCars] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        setNotLoggedIn(false);
        setHasNoCars(false);

        // ✅ failsafe 1: user not logged in
        if (!isLoggedIn()) {
          if (!cancelled) {
            setNotLoggedIn(true);
            setVehicles([]);
          }
          return;
        }

        const ownerships = (await fetchCarOwnerships()) as CarOwnershipApi[];
        const mapped = ownerships.map(ownershipToVehicle);

        if (!cancelled) {
          setVehicles(mapped);
          // ✅ failsafe 2: logged in but no cars
          setHasNoCars(mapped.length === 0);
        }
      } catch (e: any) {
        if (cancelled) return;

        if (e instanceof AuthError || e?.name === "AuthError") {
          setNotLoggedIn(true);
          setVehicles([]);
          return;
        }

        setError(e?.message ?? "Failed to load vehicles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { vehicles, loading, error, notLoggedIn, hasNoCars };
}
