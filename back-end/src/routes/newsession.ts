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

    if (!pointid || !starttime || !endtime || !totalkwh) {
        const err = makeErrorLog(req, 400, "Missing required fields");
        return res.status(400).json(err);
    }

    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Parse Dates
    const start = new Date(starttime);
    const end = new Date(endtime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = makeErrorLog(req, 400, "Invalid date format");
        return res.status(400).json(err);
    }

    await prisma.session.create({
        data: {
            userId: userId,
            chargerId: Number(pointid),
            startedAt: start,
            endedAt: end,
            kWh: Number(totalkwh),
            pricePerKWh: Number(kwhprice || 0),
            costEur: Number(amount || 0),
            status: SessionStatus.COMPLETED, 
        }
    });

    // Success: Empty Body
    return res.status(200).send();

  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

router.post("/", verifyToken, handleNewSession);

export default router;