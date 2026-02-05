import axios from "axios";
import * as xml2js from "xml2js";

const ENTSOE_API_URL = "https://web-api.tp.entsoe.eu/api";
const ZONE_GR = "10YGR-HTSO-----Y";

// ENTSO-E wants YYYYMMDDHHmm in UTC.
function fmtUtc(dt: Date) {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const min = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${min}`;
}

function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

type HourlyPrice = { tsUtc: Date; eurPerKWh: number };

/**
 * Fetch hourly day-ahead prices and return a mapping of zone -> EUR/kWh (for "now" hour).
 * If "now" hour not found, falls back to daily average.
 */
export async function fetchLatestWholesalePrice(): Promise<Record<string, number>> {
  const token = process.env.ENTSOE_TOKEN;
  if (!token) throw new Error("ENTSOE_TOKEN missing in environment");

  // Pull a wide enough window to survive timezone/DST quirks and publication offsets.
  const now = new Date();
  const start = new Date(now.getTime() - 12 * 60 * 60 * 1000); // -12h
  const end = new Date(now.getTime() + 36 * 60 * 60 * 1000);   // +36h

  const url =
    `${ENTSOE_API_URL}?securityToken=${token}` +
    `&documentType=A44` +
    `&in_Domain=${ZONE_GR}&out_Domain=${ZONE_GR}` +
    `&periodStart=${fmtUtc(start)}` +
    `&periodEnd=${fmtUtc(end)}`;

  const resp = await axios.get(url, { responseType: "text" });

  const parsed = await xml2js.parseStringPromise(resp.data, {
    explicitArray: false,
    mergeAttrs: true,
  });

  const doc = parsed?.Publication_MarketDocument;
  const timeSeriesList = asArray(doc?.TimeSeries);

  // Collect all hourly points from all time series/periods.
  const all: HourlyPrice[] = [];

  for (const ts of timeSeriesList) {
    const periods = asArray(ts?.Period);
    for (const p of periods) {
      const timeInterval = p?.timeInterval;
      const startStr = timeInterval?.start;
      if (!startStr) continue;

      const periodStartUtc = new Date(startStr); // usually ISO string
      const points = asArray(p?.Point);

      for (const pt of points) {
        const pos = Number(pt?.position);
        const eurPerMWh = Number(pt?.["price.amount"]);
        if (!Number.isFinite(pos) || !Number.isFinite(eurPerMWh)) continue;

        // Position is 1-based hourly step from Period start.
        const tsUtc = new Date(periodStartUtc.getTime() + (pos - 1) * 60 * 60 * 1000);
        const eurPerKWh = eurPerMWh / 1000;

        all.push({ tsUtc, eurPerKWh });
      }
    }
  }

  // If we got nothing, fallback.
  if (all.length === 0) return { [ZONE_GR]: 0.12 };

  // Find closest hour to "now" (rounded down to hour).
  const nowHour = new Date(now);
  nowHour.setUTCMinutes(0, 0, 0);

  // Prefer exact hour match; else closest.
  const exact = all.find((x) => x.tsUtc.getTime() === nowHour.getTime());
  const chosen =
    exact ??
    all.reduce((best, cur) =>
      Math.abs(cur.tsUtc.getTime() - nowHour.getTime()) <
      Math.abs(best.tsUtc.getTime() - nowHour.getTime())
        ? cur
        : best
    );

  // Guardrails: wholesale can be negative/very low sometimes; clamp to a sane range for retail calcs.
  const wholesale = Math.max(-0.05, Math.min(chosen.eurPerKWh, 2.0));

  return { [ZONE_GR]: wholesale };
}
