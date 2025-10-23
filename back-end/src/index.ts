import express from "express";
import cors from "cors";
import chargersRouter from "./routes/chargers.ts";

const app = express();
app.use(cors());
app.use(express.json());


app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1/chargers", chargersRouter);

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

export default app;