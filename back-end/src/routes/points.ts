// src/routes/points.ts
import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { ChargerStatus, ReservationStatus } from "@prisma/client";

const router = express.Router();

/**
 * API status vocabulary (what frontend uses)
 */
type ApiStatus = "available" | "in_use" | "outage";

/**
 * Map API query/status -> DB enum
 */
const apiToDbStatus: Record<ApiStatus, ChargerStatus> = {
  available: ChargerStatus.AVAILABLE,
  in_use: ChargerStatus.IN_USE,
  outage: ChargerStatus.OUTAGE,
};

/**
 * Map DB enum -> API status
 */
const dbToApiStatus = (db: ChargerStatus): ApiStatus => {
  switch (db) {
    case ChargerStatus.AVAILABLE:
      return "available";
    case ChargerStatus.IN_USE:
      return "in_use";
    case ChargerStatus.OUTAGE:
      return "outage";
  }
};

const allowedStatuses = Object.keys(apiToDbStatus).join(", ");

/**
 * GET /points
 * List all charging points
 * Optional: ?status=available|in_use|outage
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let where: { status?: ChargerStatus } = {};

    if (status !== undefined) {
      const statusStr = String(status).toLowerCase() as ApiStatus;

      if (!(statusStr in apiToDbStatus)) {
        const errorLog = makeErrorLog(
          req,
          400,
          `Invalid status '${statusStr}'. Allowed values: ${allowedStatuses}`
        );
        return res.status(400).json(errorLog);
      }

      where.status = apiToDbStatus[statusStr];
    }

    const chargers = await prisma.charger.findMany({ where });

    if (chargers.length === 0) return res.status(204).send();

    const result = chargers.map((c) => ({
      pointid: c.id,
      providerName: c.providerName || "unknown",
      name: c.name,
      address: c.address ?? "",
      connectorType: c.connectorType, // "CCS" | "CHADEMO" | "TYPE2"
      lon: String(c.lng),
      lat: String(c.lat),
      status: dbToApiStatus(c.status), // ✅ always available|in_use|outage
      cap: c.maxKW,
      kwhprice: c.kwhprice,
    }));

    return res.status(200).json({ points: result });
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

/**
 * GET /points/:id
 * Return info about one specific charging point
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      const errorLog = makeErrorLog(req, 400, `Invalid charger id: '${req.params.id}'`);
      return res.status(400).json(errorLog);
    }

    const charger = await prisma.charger.findUnique({ where: { id } });

    if (!charger) {
      const errorLog = makeErrorLog(req, 404, `Charger with id ${id} not found`);
      return res.status(404).json(errorLog);
    }

    // Active reservation (if any) to compute reservationendtime
    const activeReservation = await prisma.reservation.findFirst({
      where: {
        chargerId: charger.id,
        status: ReservationStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const resEndTime = activeReservation
      ? activeReservation.expiresAt.toISOString().replace("T", " ").substring(0, 16)
      : nowStr;

    const result = {
      pointid: charger.id,
      providerName: charger.providerName || "unknown",
      name: charger.name,
      address: charger.address ?? "",
      connectorType: charger.connectorType,
      lon: String(charger.lng),
      lat: String(charger.lat),
      status: dbToApiStatus(charger.status), // ✅ consistent
      cap: charger.maxKW,
      kwhprice: charger.kwhprice,            // ✅ real price (not hardcoded 0.50)
      reservationendtime: resEndTime,
    };

    return res.status(200).json(result);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

export default router;
