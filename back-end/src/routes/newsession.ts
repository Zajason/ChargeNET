import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts";
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { verifyToken } from "../middleware/verifyToken.ts";
import { SessionStatus } from "@prisma/client";

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

    // 1. Έλεγχος πληρότητας πεδίων -> 400 Bad Request
    if (!pointid || !starttime || !endtime || !totalkwh || kwhprice === undefined || amount === undefined) {
        const err = makeErrorLog(req, 400, "Missing required fields");
        return res.status(400).json(err);
    }

    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // 2. Έλεγχος ύπαρξης φορτιστή
    // Αν δεν υπάρχει, επιστρέφουμε 400 (σύμφωνα με τις προδιαγραφές) αντί για 404
    const charger = await prisma.charger.findUnique({
        where: { id: Number(pointid) }
    });

    if (!charger) {
        return res.status(400).json(makeErrorLog(req, 400, "Invalid pointid: Charger not found"));
    }

    // 3. Έλεγχος ημερομηνιών -> 400 Bad Request
    const start = new Date(starttime);
    const end = new Date(endtime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = makeErrorLog(req, 400, "Invalid date format");
        return res.status(400).json(err);
    }

    // Δημιουργία Session με τις τιμές που έδωσε ο ΧΡΗΣΤΗΣ (Custom Values)
    await prisma.session.create({
        data: {
            userId: userId,
            chargerId: Number(pointid),
            startedAt: start,
            endedAt: end,
            kWh: Number(totalkwh),
            pricePerKWh: Number(kwhprice), // Τιμή από το body
            costEur: Number(amount),       // Τιμή από το body
            status: SessionStatus.COMPLETED, 
        }
    });

    // Success: Empty Body (200 OK)
    return res.status(200).send();

  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

router.post("/", verifyToken, handleNewSession);

export default router;