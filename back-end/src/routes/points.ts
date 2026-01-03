// src/routes/points.ts
import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { ChargerStatus, ReservationStatus } from "@prisma/client";

const router = express.Router();

// Keep same mapping as before
const statusMap: Record<string, ChargerStatus> = {
  available: ChargerStatus.AVAILABLE,
  charging: ChargerStatus.IN_USE,
  reserved: ChargerStatus.AVAILABLE,
  malfunction: ChargerStatus.OUTAGE,
  offline: ChargerStatus.OUTAGE,
};

// Helper για να βρίσκουμε το string status από το Enum (reverse mapping)
const getStatusString = (dbStatus: ChargerStatus): string => {
    const entry = Object.entries(statusMap).find(([key, val]) => val === dbStatus);
    return entry ? entry[0] : dbStatus.toLowerCase();
};

/**
 * GET /points
 * List all charging points
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let chargers;

    if (status) {
      const statusStr = String(status).toLowerCase();
      const mapped = statusMap[statusStr];
      
      if (!mapped) {
        const errorLog = makeErrorLog(
          req,
          401,
          `Invalid status '${statusStr}'. Allowed values: ${Object.keys(statusMap).join(", ")}`
        );
        return res.status(401).json(errorLog);
      }

      chargers = await prisma.charger.findMany({ where: { status: mapped } });
    } else {
      chargers = await prisma.charger.findMany();
    }

    if (chargers.length === 0) return res.status(204).send();

    // MAPPING
    const result = chargers.map(c => ({
      pointid: c.id,
      providerName: c.providerName || "unknown",
      lon: String(c.lng),
      lat: String(c.lat),
      status: getStatusString(c.status),
      cap: c.maxKW
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

    const charger = await prisma.charger.findUnique({
      where: { id },
    });

    if (!charger) {
      const errorLog = makeErrorLog(req, 404, `Charger with id ${id} not found`);
      return res.status(404).json(errorLog);
    }

    // Λογική για το reservationendtime
    // Ψάχνουμε αν υπάρχει ενεργή κράτηση για αυτόν τον φορτιστή
    const activeReservation = await prisma.reservation.findFirst({
        where: {
            chargerId: charger.id,
            status: ReservationStatus.ACTIVE,
            expiresAt: { gt: new Date() }
        },
        orderBy: { expiresAt: 'desc' }
    });

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const resEndTime = activeReservation 
        ? activeReservation.expiresAt.toISOString().replace("T", " ").substring(0, 16)
        : nowStr;

    // MAPPING
    const result = {
      pointid: charger.id,
      lon: String(charger.lng),
      lat: String(charger.lat),
      status: getStatusString(charger.status),
      cap: charger.maxKW,
      reservationendtime: resEndTime,
      kwhprice: 0.50,
      providerName: charger.providerName
    };

    return res.status(200).json(result);

  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

export default router;