// src/index.ts
import express from "express";
import cors from "cors";

import chargersRouter from "./routes/chargers.ts";
import meRouter from "./routes/me.ts";
import adminRouter from "./routes/admin/index.ts";
import pointsRouter from "./routes/points.ts";
import reserveRouter from "./routes/reserve.ts";

const app = express();

app.use(cors());
app.use(express.json());

// --- Application routes ---
app.use("/api/v1/points", pointsRouter);
app.use("/api/v1/reserve", reserveRouter);
app.use("/api/v1/me", meRouter);
app.use("/api/v1/chargers", chargersRouter);
app.use("/api/v1/admin", adminRouter);

// simple generic system health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

export default app;