// routes/points.ts
import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { ChargerStatus } from "@prisma/client";

const router = express.Router();

// Keep same mapping as before
const statusMap: Record<string, ChargerStatus> = {
  available: ChargerStatus.AVAILABLE,
  charging: ChargerStatus.IN_USE,
  reserved: ChargerStatus.AVAILABLE,     // adjust if RESERVED is added
  malfunction: ChargerStatus.OUTAGE,
  offline: ChargerStatus.OUTAGE,
};

/**
 * GET /points
 * (already existing)
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

    const result = chargers.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      lat: Number(c.lat),
      lng: Number(c.lng),
      connectorType: c.connectorType,
      maxKW: c.maxKW,
      status:
        Object.keys(statusMap).find(k => statusMap[k] === c.status)?.toLowerCase() ??
        c.status.toLowerCase(),
      providerName: c.providerName,
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

    const result = {
      id: charger.id,
      name: charger.name,
      address: charger.address,
      lat: Number(charger.lat),
      lng: Number(charger.lng),
      connectorType: charger.connectorType,
      maxKW: charger.maxKW,
      status:
        Object.keys(statusMap).find(k => statusMap[k] === charger.status)?.toLowerCase() ??
        charger.status.toLowerCase(),
      providerName: charger.providerName,
    };

    return res.status(200).json(result);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

export default router;