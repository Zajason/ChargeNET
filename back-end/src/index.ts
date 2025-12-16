import express from "express";
import cors from "cors";
import chargersRouter from "./routes/chargers.ts";
import meRouter from "./routes/me.ts";
import adminRouter from "./routes/admin/index.ts";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/me", meRouter);
app.use("/api/v1/chargers", chargersRouter);

// — Single mount point for all admin-related routes —
app.use("/api/v1/admin", adminRouter);

// simple generic system health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () =>
    console.log(`API running on http://localhost:${port}`)
  );
}

export default app;