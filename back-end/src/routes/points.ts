import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { ChargerStatus, ReservationStatus } from "@prisma/client";

const router = express.Router();

/**
 * Map API query/status -> DB enum
 * Προσθέσαμε συνώνυμα (charging, reserved) για να δουλεύει ευέλικτα το CLI
 */
const apiToDbStatus: Record<string, ChargerStatus> = {
  available: ChargerStatus.AVAILABLE,
  in_use: ChargerStatus.IN_USE,
  charging: ChargerStatus.IN_USE, // <--- ΠΡΟΣΘΗΚΗ
  reserved: ChargerStatus.IN_USE, // <--- ΠΡΟΣΘΗΚΗ
  outage: ChargerStatus.OUTAGE,
  outoforder: ChargerStatus.OUTAGE, // <--- ΠΡΟΣΘΗΚΗ
};

/**
 * Map DB enum -> API status
 */
const getStatusString = (db: ChargerStatus): string => {
  switch (db) {
    case ChargerStatus.AVAILABLE: return "available";
    case ChargerStatus.IN_USE: return "in_use";
    case ChargerStatus.OUTAGE: return "outage";
    default: return "unknown";
  }
};

const allowedStatuses = Object.keys(apiToDbStatus).join(", ");

/**
 * GET /points
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let where: { status?: ChargerStatus } = {};

    if (status !== undefined) {
      const statusStr = String(status).toLowerCase(); // Αφαιρέσαμε το strict casting για ευελιξία

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

    const chargers = await prisma.charger.findMany({ 
        where,
        orderBy: { id: 'asc' }
    });

    // Επιστροφή κενού πίνακα αντί για 204 για να μην σκάει το CLI parsing
    if (chargers.length === 0) return res.status(200).json([]);

    const result = chargers.map((c) => ({
      pointid: c.id,
      providerName: c.providerName || "unknown",
      name: c.name,
      address: c.address ?? "",
      connectorType: c.connectorType,
      lon: String(c.lng),
      lat: String(c.lat),
      status: getStatusString(c.status),
      cap: c.maxKW,
      kwhprice: c.kwhprice,
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

/**
 * GET /points/:id
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
      status: getStatusString(charger.status),
      cap: charger.maxKW,
      kwhprice: charger.kwhprice,
      reservationendtime: resEndTime,
    };

    return res.status(200).json(result);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

export default router;