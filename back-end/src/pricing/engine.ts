import prisma from "../prisma/client.ts";
import { fetchLatestWholesalePrice } from "./entsoeClient.ts";
import { computeRetailPrice, mapLatLngToZone } from "./rules.ts";

/**
 * Fetch wholesale prices and update every charger’s kWh price.
 */
export async function updatePricesForAllChargers() {
  console.log("[Pricing] Fetching wholesale data …");
  const wholesale = await fetchLatestWholesalePrice();
  console.log("[Pricing] Wholesale data received:", wholesale);

  const chargers = await prisma.charger.findMany();
  console.log(`[Pricing] Updating ${chargers.length} chargers…`);

  for (const c of chargers) {
    const zone = mapLatLngToZone(Number(c.lat), Number(c.lng));
    const wholesaleEurPerKWh =
      wholesale[zone] ?? Object.values(wholesale)[0] ?? 0.10;

    const newPrice = computeRetailPrice({
      wholesaleEurPerKWh,
      connectorType: c.connectorType,
      maxKW: c.maxKW,
    });

    await prisma.charger.update({
      where: { id: c.id },
      data: { kwhprice: newPrice },
    });
  }

  console.log("[Pricing] Price update completed ✅");
}