import axios from "axios";
import * as xml2js from "xml2js";

const ENTSOE_API_URL = "https://web-api.tp.entsoe.eu/api";
const ZONE_GR = "10YGR-HTSO-----Y"; // example: Greece. Add more zones if needed.

/**
 * Fetch the latest day‑ahead hourly prices from ENTSO‑E.
 * Returns a mapping of zone → average EUR / kWh.
 */
export async function fetchLatestWholesalePrice(): Promise<Record<string, number>> {
  const token = process.env.ENTSOE_TOKEN;
  if (!token) throw new Error("ENTSOE_TOKEN missing in environment");

  // Determine current day period
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const periodStart = `${yyyy}${mm}${dd}0000`;
  const periodEnd = `${yyyy}${mm}${dd}2300`;

  const url =
    `${ENTSOE_API_URL}?securityToken=${token}` +
    `&documentType=A44` +
    `&in_Domain=${ZONE_GR}&out_Domain=${ZONE_GR}` +
    `&periodStart=${periodStart}&periodEnd=${periodEnd}`;

  const resp = await axios.get(url, { responseType: "text" });

  // Parse the XML payload
  const parsed = await xml2js.parseStringPromise(resp.data, { explicitArray: false });

  const pts =
    parsed?.Publication_MarketDocument?.TimeSeries?.Period?.Point ?? [];

  // Convert  EUR / MWh  ->  EUR / kWh
  const prices = Array.isArray(pts) ? pts.map((p) => Number(p["price.amount"])) : [];

  const avgPriceEurPerKWh =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length / 1000
      : 0.1;

  // Return per zone mapping
  return { [ZONE_GR]: avgPriceEurPerKWh };
}