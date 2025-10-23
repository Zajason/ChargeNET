import { Router } from "express";
import prisma from "../prisma/client.ts";

const router = Router();

/** Helpers */
function parseCommaList(v?: string) {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
const toNum = (v: unknown) =>
  v === undefined ? undefined : Number(v);
function deg2rad(d: number) { return d * Math.PI / 180; }
function haversineKm(aLat:number,aLng:number,bLat:number,bLng:number){
  const R=6371;
  const dLat=deg2rad(bLat-aLat);
  const dLng=deg2rad(bLng-aLng);
  const s=Math.sin(dLat/2)**2 + Math.cos(deg2rad(aLat))*Math.cos(deg2rad(bLat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

/**
 * GET /api/v1/chargers
 * Query params (all optional):
 * - q: string (search name/address)
 * - status: 'AVAILABLE' | 'IN_USE' | 'OUTAGE'
 * - connectorType: 'CCS,CHADEMO,TYPE2' (comma-separated)
 * - minKW, maxKW: numbers
 * - lat, lng, radiusKm: numbers (geo filter)
 * - sort: 'distance' | 'power' | 'name'
 * - order: 'asc' | 'desc' (default: asc)
 * - page, pageSize: numbers (default: 1, 20)
 */
router.get("/", async (req, res) => {
  try {
    // Parse query
    const q = (req.query.q as string | undefined) || undefined;
    const status = (req.query.status as "AVAILABLE" | "IN_USE" | "OUTAGE" | undefined);
    const connectorList = parseCommaList(req.query.connectorType as string | undefined);
    const minKW = toNum(req.query.minKW);
    const maxKW = toNum(req.query.maxKW);
    const lat = toNum(req.query.lat);
    const lng = toNum(req.query.lng);
    const radiusKm = toNum(req.query.radiusKm);
    const sort = (req.query.sort as "distance" | "power" | "name" | undefined);
    const order = (req.query.order as "asc" | "desc" | undefined) ?? "asc";
    const page = Math.max(1, toNum(req.query.page) ?? 1);
    const pageSize = Math.min(100, Math.max(1, toNum(req.query.pageSize) ?? 20));

    // Build Prisma 'where'
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status; // ChargerStatus enum
    }

    if (connectorList.length) {
      // ConnectorType enum list
      where.connectorType = { in: connectorList };
    }

    if (minKW || maxKW) {
      where.maxKW = {};
      if (minKW !== undefined) where.maxKW.gte = minKW;
      if (maxKW !== undefined) where.maxKW.lte = maxKW;
    }

    // Optional geo bounding box pre-filter (fast rough filter)
    let useGeo = false;
    let bbox:
      | { latMin: number; latMax: number; lngMin: number; lngMax: number }
      | null = null;

    if (
      lat !== undefined &&
      lng !== undefined &&
      radiusKm !== undefined &&
      radiusKm > 0
    ) {
      useGeo = true;
      const dLat = radiusKm / 111; // ~111 km per 1° latitude
      const dLng = radiusKm / (111 * Math.cos(deg2rad(lat)));
      bbox = {
        latMin: lat - dLat,
        latMax: lat + dLat,
        lngMin: lng - dLng,
        lngMax: lng + dLng,
      };
      where.AND = [
        ...(where.AND ?? []),
        { lat: { gte: bbox.latMin, lte: bbox.latMax } },
        { lng: { gte: bbox.lngMin, lte: bbox.lngMax } },
      ];
    }

    // Count for pagination (before fetching)
    const total = await prisma.charger.count({ where });

    // DB ordering for simple sorts
    let orderBy: any = undefined;
    if (sort === "power") orderBy = { maxKW: order };
    if (sort === "name") orderBy = { name: order };

    // Fetch page
    const rows = await prisma.charger.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        pricingProfile: true, // in case frontend needs name/id
      },
    });

    // Enrich results: lat/lng are Decimal in Prisma; convert to Number
    let items = rows.map((c) => {
      const latNum = Number(c.lat);
      const lngNum = Number(c.lng);

      const base = {
        id: c.id,
        name: c.name,
        address: c.address,
        lat: latNum,
        lng: lngNum,
        connectorType: c.connectorType,
        maxKW: c.maxKW,
        status: c.status,
        pricingProfileId: c.pricingProfileId ?? null,
      };

      if (useGeo) {
        return {
          ...base,
          distanceKm: haversineKm(lat!, lng!, latNum, lngNum),
        };
      }
      return base;
    });

    // In-memory sorting for distance (requires computed value)
    if (sort === "distance") {
      items.sort((a: any, b: any) => {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return order === "desc" ? db - da : da - db;
      });
    }

    res.json({
      items,
      page,
      pageSize,
      total,
    });
  } catch (err) {
    console.error("GET /chargers error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;