// src/routes/reserve.ts
import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { requireUser } from "../middleware/mockAuth.ts";
import { ChargerStatus, ReservationStatus } from "@prisma/client";

const router = express.Router();

/**
 * Shared handler for both /:id and /:id/:minutes
 */
const handleReserve = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      const err = makeErrorLog(req, 400, `Invalid charger id '${req.params.id}'`);
      return res.status(400).json(err);
    }

    // default 30 min, clamp 60 max
    const minutesRaw = Number(req.params.minutes);
    const minutes = !minutesRaw || isNaN(minutesRaw) ? 30 : Math.min(minutesRaw, 60);

    // fetch charger
    const charger = await prisma.charger.findUnique({ where: { id } });
    if (!charger) {
      const err = makeErrorLog(req, 404, `Charger ${id} not found`);
      return res.status(404).json(err);
    }

    // must be available
    if (charger.status !== ChargerStatus.AVAILABLE) {
      const err = makeErrorLog(
        req,
        409,
        `Charger ${id} is not available (current status: ${charger.status})`
      );
      return res.status(409).json(err);
    }

    const userId = (req as any).userId as number;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + minutes * 60_000);

    // create reservation + update charger in single transaction
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

    // response
    const payload = {
      chargerId: updatedCharger.id,
      providerName: updatedCharger.providerName,
      name: updatedCharger.name,
      lat: Number(updatedCharger.lat),
      lng: Number(updatedCharger.lng),
      connectorType: updatedCharger.connectorType,
      maxKW: updatedCharger.maxKW,
      status: "reserved",
      reservation: {
        id: reservation.id,
        userId,
        startsAt: reservation.startsAt.toISOString(),
        expiresAt: reservation.expiresAt.toISOString(),
        durationMinutes: minutes,
      },
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

// Two explicit routes — avoids the "Unexpected ?" parser error
router.post("/:id", requireUser, handleReserve);
router.post("/:id/:minutes", requireUser, handleReserve);

export default router;