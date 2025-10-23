import { Router, Request, Response, NextFunction } from "express";
import prisma from "../prisma/client.ts";
import { z } from "zod";

// ---- Temporary mock auth middleware ----
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.header("x-mock-role"); // simulate auth
  if (role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden: admin role required" });
  }
  next();
}

// ---- Validation schema ----
const chargerSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  connectorType: z.enum(["CCS", "CHADEMO", "TYPE2"]),
  maxKW: z.number().positive(),
  status: z.enum(["AVAILABLE", "IN_USE", "OUTAGE"]).optional(),
});

const router = Router();

// ------------------- CREATE -------------------
router.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = chargerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const charger = await prisma.charger.create({
      data: parsed.data,
    });

    res.status(201).json(charger);
  } catch (err) {
    console.error("Error creating charger:", err);
    res.status(500).json({ error: "Failed to create charger" });
  }
});

// ------------------- UPDATE -------------------
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid charger ID" });

    const parsed = chargerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const updated = await prisma.charger.update({
      where: { id },
      data: parsed.data,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating charger:", err);
    res.status(500).json({ error: "Failed to update charger" });
  }
});

// ------------------- DELETE -------------------
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid charger ID" });

    await prisma.charger.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting charger:", err);
    res.status(500).json({ error: "Failed to delete charger" });
  }
});

export default router;