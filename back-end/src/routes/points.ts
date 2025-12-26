import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { ChargerStatus } from "@prisma/client";

const router = express.Router();

// Mapping between API status strings and your internal ChargerStatus
const statusMap: Record<string, ChargerStatus> = {
  available: ChargerStatus.AVAILABLE,
  charging: ChargerStatus.IN_USE,
  reserved: ChargerStatus.AVAILABLE,     // adjust if you later add RESERVED
  malfunction: ChargerStatus.OUTAGE,
  offline: ChargerStatus.OUTAGE,         // adjust if you later add OFFLINE
};

/**
 * GET /points
 * GET /points?status=xxxxx
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let chargers;

    if (status) {
      const statusStr = String(status).toLowerCase();

      // Validate status against allowed enumeration
      const mapped = statusMap[statusStr];
      if (!mapped) {
        const errorLog = makeErrorLog(
          req,
          401,
          `Invalid status '${statusStr}'. Allowed values: ${Object.keys(statusMap).join(", ")}`
        );
        return res.status(401).json(errorLog);
      }

      chargers = await prisma.charger.findMany({
        where: { status: mapped },
      });
    } else {
      chargers = await prisma.charger.findMany();
    }

    if (chargers.length === 0) {
      return res.status(204).send(); // No content
    }

    // Map internal fields to output format (lowercase status, rename if desired)
    const result = chargers.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      lat: Number(c.lat),
      lng: Number(c.lng),
      connectorType: c.connectorType,
      maxKW: c.maxKW,
      status: Object.keys(statusMap).find(k => statusMap[k] === c.status)?.toLowerCase() ?? c.status.toLowerCase(),
      providerName: c.providerName,
    }));

    return res.status(200).json({ points: result });
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
});

export default router;