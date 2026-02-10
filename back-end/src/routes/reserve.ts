// src/routes/reserve.ts
import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { verifyToken } from "../middleware/verifyToken.ts";
import { ChargerStatus, ReservationStatus } from "@prisma/client";
import { preAuthorize, cancelPreAuth } from "../controllers/paymentController.ts";

const router = express.Router();

const handleReserve = async (req: Request, res: Response) => {
  try {
    console.log("[reserve] incoming request", { path: req.path, params: req.params });
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
    // Έχει ο χρήστης ήδη ενεργή κράτηση;
    const existingReservation = await prisma.reservation.findFirst({
        where: {
            userId: userId,
            status: ReservationStatus.ACTIVE, // Πρέπει να είναι ενεργή
            expiresAt: { gt: now }            // ΚΑΙ να μην έχει λήξει ο χρόνος της
        }
    });

    if (existingReservation) {
        const err = makeErrorLog(
            req,
            400,
            "User already has an active reservation. You cannot reserve multiple points simultaneously."
        );
        return res.status(400).json(err);
    }

    // Check user has a saved payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId, provider: 'stripe', status: 'valid', stripePaymentMethodId: { not: null } },
    });
    if (!paymentMethod) {
      return res.status(400).json({ error: "You must add a payment method before reserving. Go to Billing to add a card." });
    }

    // Pre-authorize 3 EUR
    let intent;
    try {
      intent = await preAuthorize(userId, 3);
    } catch (preAuthErr: any) {
      console.error("[reserve] pre-auth failed:", preAuthErr.message);
      return res.status(402).json({ error: "Payment pre-authorization failed. Please check your card.", details: preAuthErr.message });
    }

    const expiresAt = new Date(now.getTime() + minutes * 60_000);

    const [reservation, updatedCharger] = await prisma.$transaction([
      prisma.reservation.create({
        data: {
          userId,
          chargerId: charger.id,
          startsAt: now,
          expiresAt,
          status: ReservationStatus.ACTIVE,
          paymentIntentId: intent.id,
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
      reservationId: reservation.id,
      preAuthSuccess: true,
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};


// Cancel reservation for charger id (only owner can cancel)
// Define handler before registering routes so it can be referenced safely
const handleCancel = async (req: Request, res: Response) => {
  try {
    console.log("[cancel] incoming request", { path: req.path, params: req.params });
    const id = Number(req.params.id);
    if (isNaN(id)) {
      const err = makeErrorLog(req, 400, `Invalid charger id '${req.params.id}'`);
      return res.status(400).json(err);
    }

    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Find an active reservation for this charger that belongs to the user
    const reservation = await prisma.reservation.findFirst({
      where: {
        chargerId: id,
        userId,
        status: ReservationStatus.ACTIVE,
        expiresAt: { gt: new Date() }
      }
    });

    if (!reservation) {
      const err = makeErrorLog(req, 404, `Active reservation not found for charger ${id} and user`);
      return res.status(404).json(err);
    }

    // Cancel the pre-auth hold if one exists
    if (reservation.paymentIntentId) {
      try {
        await cancelPreAuth(reservation.paymentIntentId);
      } catch (e) {
        console.error("[cancel] failed to cancel pre-auth:", e);
      }
    }

    const [updatedRes, updatedCharger] = await prisma.$transaction([
      prisma.reservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.CANCELLED } }),
      prisma.charger.update({ where: { id }, data: { status: ChargerStatus.AVAILABLE } }),
    ]);

    return res.status(200).json({ ok: true, chargerId: id });
  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

// Register routes - ensure '/:id/cancel' is checked before '/:id/:minutes'
router.post("/:id/cancel", verifyToken, handleCancel);
router.post("/:id/:minutes", verifyToken, handleReserve);
router.post("/:id", verifyToken, handleReserve);

export default router;