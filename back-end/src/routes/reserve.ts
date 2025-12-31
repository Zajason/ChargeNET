// src/routes/reserve.ts
import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { verifyToken } from "../middleware/verifyToken.ts";
import { ChargerStatus, ReservationStatus } from "@prisma/client";

const router = express.Router();

const handleReserve = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      const err = makeErrorLog(req, 400, `Invalid charger id '${req.params.id}'`);
      return res.status(400).json(err);
    }

    const minutesRaw = Number(req.params.minutes);
    const minutes = !minutesRaw || isNaN(minutesRaw) ? 30 : Math.min(minutesRaw, 60);

    const charger = await prisma.charger.findUnique({ where: { id } });
    if (!charger) {
      const err = makeErrorLog(req, 404, `Charger ${id} not found`);
      return res.status(404).json(err);
    }

    if (charger.status !== ChargerStatus.AVAILABLE) {
      const err = makeErrorLog(
        req,
        409,
        `Charger ${id} is not available (current status: ${charger.status})`
      );
      return res.status(409).json(err);
    }

    const userId = req.userId; 

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized: User ID missing from token" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + minutes * 60_000);

    const [reservation, updatedCharger] = await prisma.$transaction([
      prisma.reservation.create({
        data: {
          userId,
          chargerId: charger.id,
          startsAt: now,
          expiresAt,
          status: ReservationStatus.ACTIVE,
        },
      }),
      prisma.charger.update({
        where: { id: charger.id },
        data: { status: ChargerStatus.IN_USE },
      }),
    ]);

    const payload = {
      pointid: String(updatedCharger.id),
      status: "reserved",
      reservationendtime: reservation.expiresAt.toISOString().replace("T", " ").substring(0, 16),
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

router.post("/:id", verifyToken, handleReserve);
router.post("/:id/:minutes", verifyToken, handleReserve);

export default router;