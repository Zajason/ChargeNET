import express, { Request, Response } from "express";
import prisma from "../prisma/client"; // removed .ts extension
import { makeErrorLog } from "../middleware/errorHandler";
import { verifyToken } from "../middleware/verifyToken";
import { SessionStatus, ReservationStatus } from "@prisma/client"; // Added ReservationStatus

const router = express.Router();

const handleNewSession = async (req: Request, res: Response) => {
  try {
    // Input Fields
    const { 
        pointid,
        starttime, 
        endtime, 
        startsoc, 
        endsoc, 
        totalkwh, 
        kwhprice, 
        amount 
    } = req.body;

    // 1. Validation check
    if (!pointid || !starttime || !endtime || !totalkwh || kwhprice === undefined || amount === undefined) {
        const err = makeErrorLog(req, 400, "Missing required fields");
        return res.status(400).json(err);
    }

    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // 2. Fetch Charger & Active Reservations
    const charger = await prisma.charger.findUnique({
        where: { id: Number(pointid) },
        include: {
            reservations: {
                where: {
                    status: ReservationStatus.ACTIVE, // Only look for active ones
                    expiresAt: { gt: new Date() }     // That haven't expired
                }
            }
        }
    });

    if (!charger) {
        return res.status(400).json(makeErrorLog(req, 400, "Invalid pointid: Charger not found"));
    }

    // --- CRITICAL LOGIC FIX START ---
    // If the charger is NOT available, we must verify if the user has the right to use it.
    if (charger.status !== "AVAILABLE") {
        
        // Check if ANY of the active reservations belong to THIS user
        const myReservation = charger.reservations.find(r => r.userId === userId);

        if (myReservation) {
            // ✅ Case A: Charger is reserved by ME. Allow access.
            // Mark the reservation as COMPLETED so it doesn't block future actions.
            await prisma.reservation.update({
                where: { id: myReservation.id },
                data: { status: ReservationStatus.COMPLETED } 
            });
            // Proceed to session creation...
        } else {
            // ❌ Case B: Charger is busy/outage/reserved by someone else. Block access.
            const msg = charger.status === "OUTAGE" 
                ? "Charger is out of order" 
                : "Charger is currently in use or reserved by another user";
            
            return res.status(403).json(makeErrorLog(req, 403, msg));
        }
    }
    // --- CRITICAL LOGIC FIX END ---

    // 3. Date Validation
    const start = new Date(starttime);
    const end = new Date(endtime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = makeErrorLog(req, 400, "Invalid date format");
        return res.status(400).json(err);
    }

    // 4. Create Session
    await prisma.session.create({
        data: {
            userId: userId,
            chargerId: Number(pointid),
            startedAt: start,
            endedAt: end,
            kWh: Number(totalkwh),
            pricePerKWh: Number(kwhprice),
            costEur: Number(amount),
            status: SessionStatus.COMPLETED, 
        }
    });

    // 5. Success
    return res.status(200).send();

  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

router.post("/", verifyToken, handleNewSession);

export default router;