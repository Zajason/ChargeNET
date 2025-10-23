import { Router } from "express";
import prisma from "../prisma/client.ts";
import { requireUser } from "../middleware/mockAuth.ts";

const router = Router();

/**
 * GET /api/v1/me
 * Returns the current user's profile (no password) and a few quick stats.
 * Auth: requireUser (temporary mock)
 */
router.get("/", requireUser, async (req, res) => {
  try {
    const userId = (req as any).userId as number;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // add more if you want (e.g., default payment method), never return password
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Optional lightweight stats the profile screen might show
    const [sessionCount, totalKWh] = await Promise.all([
      prisma.session.count({ where: { userId } }),
      prisma.session.aggregate({
        _sum: { kWh: true },
        where: { userId },
      }),
    ]);

    res.json({
      user,
      stats: {
        sessions: sessionCount,
        totalKWh: totalKWh._sum.kWh ?? 0,
      },
    });
  } catch (e) {
    console.error("GET /me error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;