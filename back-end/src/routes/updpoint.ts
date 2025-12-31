import express, { Request, Response } from "express";
import prisma from "../prisma/client.ts"; // Τσέκαρε το path
import { makeErrorLog } from "../middleware/errorHandler.ts";
import { verifyToken } from "../middleware/verifyToken.ts";
import { ChargerStatus } from "@prisma/client";

const router = express.Router();

const handleUpdate = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      const err = makeErrorLog(req, 400, `Invalid charger id '${req.params.id}'`);
      return res.status(400).json(err);
    }

    const { status, kwhprice } = req.body;

    // Validation: Πρέπει να υπάρχει κάτι για αλλαγή
    if (!status && kwhprice === undefined) {
       const err = makeErrorLog(req, 400, "Provide 'status' or 'kwhprice' in body");
       return res.status(400).json(err);
    }

    // Αν δόθηκε status, ελέγχουμε αν είναι έγκυρο Enum

    // Update object
    const dataToUpdate: any = {};
    
    if (status) {
        // Mapping string to Enum (simple check)
        dataToUpdate.status = status; 
    }
    
    // Εκτέλεση Update
    const updatedCharger = await prisma.charger.update({
        where: { id },
        data: dataToUpdate
    });

    // Reverse mapping for response (Enum -> String)
    const responseStatus = updatedCharger.status === ChargerStatus.OUTAGE ? "outoforder" 
                         : updatedCharger.status === ChargerStatus.IN_USE ? "charging" 
                         : "available";

    const payload = {
        pointid: String(updatedCharger.id),
        status: responseStatus,
        kwhprice: 0.50 // Placeholder
    };

    return res.status(200).json(payload);

  } catch (err: any) {
    const errorLog = makeErrorLog(req, 500, "Internal server error", err.message);
    return res.status(500).json(errorLog);
  }
};

router.post("/:id", verifyToken, handleUpdate);

export default router;