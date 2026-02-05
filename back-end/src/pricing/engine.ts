import prisma from "../prisma/client.ts";
import { fetchLatestWholesalePrice } from "./entsoeClient.ts";
import { computeRetailPrice, mapLatLngToZone } from "./rules.ts";

function blend(oldVal: number | null | undefined, newVal: number, alpha = 0.35) {
  // alpha = how much of the new target you take each run
  if (!Number.isFinite(oldVal as number)) return newVal;
  return (1 - alpha) * (oldVal as number) + alpha * newVal;
}

function roundToCents(x: number) {
  return Math.round(x * 100) / 100;
}

/**
 * Fetch wholesale prices and update every charger’s kWh price.
 */
export async function updatePricesForAllChargers() {
  console.log("[Pricing] Fetching wholesale data …");
  const wholesale = await fetchLatestWholesalePrice();
  console.log("[Pricing] Wholesale data received:", wholesale);

  const chargers = await prisma.charger.findMany({
    select: { id: true, lat: true, lng: true, connectorType: true, maxKW: true, kwhprice: true },
  });

  console.log(`[Pricing] Updating ${chargers.length} chargers…`);

  // Simple concurrency limiter (no extra deps)
  const CONCURRENCY = 25;
  let idx = 0;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < chargers.length) {
      const c = chargers[idx++];
      const zone = mapLatLngToZone(Number(c.lat), Number(c.lng));

      const wholesaleEurPerKWh =
        wholesale[zone] ?? Object.values(wholesale)[0] ?? 0.12;
        const now = new Date();

        const target = computeRetailPrice({
          wholesaleEurPerKWh,
          connectorType: c.connectorType,
          maxKW: c.maxKW,
          now,
        });
      const smoothed = roundToCents(blend(c.kwhprice, target, 0.35));

      // Skip microscopic updates (avoids “thrashing”)
      if (c.kwhprice != null && Math.abs(smoothed - c.kwhprice) < 0.01) continue;

      await prisma.charger.update({
        where: { id: c.id },
        data: { kwhprice: smoothed },
      });
    }
  });

  await Promise.all(workers);

  console.log("[Pricing] Price update completed ✅");
}
