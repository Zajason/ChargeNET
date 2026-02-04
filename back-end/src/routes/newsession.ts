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

    // 2. Έλεγχος ύπαρξης φορτιστή και έλεγχος κράτησης
    // Αν δεν υπάρχει, επιστρέφουμε 400
    const charger = await prisma.charger.findUnique({
        where: { id: Number(pointid) },
        // Φέρνουμε και τις ενεργές κρατήσεις για αυτόν τον φορτιστή
        include: {
            reservations: {
                where: {
                    status: "ACTIVE",
                    expiresAt: { gt: new Date() } // Που δεν έχουν λήξει
                }
            }
        }
    });

    if (!charger) {
        return res.status(400).json(makeErrorLog(req, 400, "Invalid pointid: Charger not found"));
    }
    // Αν ο φορτιστής δεν είναι AVAILABLE, πρέπει να δούμε αν είναι κρατημένος από εμάς
    if (charger.status !== "AVAILABLE") {
        
        // Ψάχνουμε αν υπάρχει κράτηση που ανήκει στον τρέχοντα χρήστη (req.userId)
        const myReservation = charger.reservations.find(r => r.userId === userId);

        if (myReservation) {
            // ✅ Ο φορτιστής είναι κρατημένος, αλλά από εμάς -> OK.
            // Προαιρετικά: Μπορούμε να μαρκάρουμε την κράτηση ως 'EXPIRED' ή 'COMPLETED' 
            // τώρα που ξεκίνησε η συνεδρία, για να μην φαίνεται εκκρεμής.
            await prisma.reservation.update({
                where: { id: myReservation.id },
                data: { status: "EXPIRED" } // Ή κάποιο status ότι χρησιμοποιήθηκε
            });
        } else {
            // ❌ Ο φορτιστής είναι 'IN_USE' ή 'OUTAGE' και δεν έχουμε κράτηση -> BLOCK
            // Αν είναι OUTAGE είναι χαλασμένος. Αν είναι IN_USE τον έχει άλλος.
            const msg = charger.status === "OUTAGE" 
                ? "Charger is out of order" 
                : "Charger is currently in use or reserved by another user";
            
            return res.status(403).json(makeErrorLog(req, 403, msg));
        }
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