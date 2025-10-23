import { NextFunction, Request, Response } from "express";

export function requireUser(req: Request, res: Response, next: NextFunction) {
  // TEMP: read user id from header until JWT is ready
  const idHeader = req.header("x-mock-user-id");
  const userId = idHeader ? Number(idHeader) : NaN;
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ error: "Unauthorized: x-mock-user-id header required (temporary)" });
  }
  // attach to req for handlers
  (req as any).userId = userId;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.header("x-mock-role");
  if (role !== "ADMIN") return res.status(403).json({ error: "Forbidden: admin role required" });
  next();
}