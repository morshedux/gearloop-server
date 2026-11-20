import "dotenv/config";
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";
import equipmentRouter from "./routes/equipment.js";
import favoritesRouter from "./routes/favorites.js";
import paymentsRouter from "./routes/payments.js";
import bookingsRouter from "./routes/bookings.js";
import analyticsRouter from "./routes/analytics.js";
import publicRouter from "./routes/public.js";
import { completeFinishedBookings } from "./jobs/completeBookings.js";

const app = express();

const allowed = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ name: "GearLoop API", status: "ok" }));

app.use("/users", usersRouter);
app.use("/equipment", equipmentRouter);
app.use("/favorites", favoritesRouter);
app.use("/payments", paymentsRouter);
app.use("/bookings", bookingsRouter);
app.use("/analytics", analyticsRouter);
app.use("/", publicRouter);

// Called by Vercel Cron (or manually) to complete finished rentals.
app.get("/api/cron/complete-bookings", async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ completed: await completeFinishedBookings() });
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.message === "Not allowed by CORS" ? 403 : err.status || 500;
  res.status(status).json({ message: status === 500 ? "Internal server error" : err.message });
});

export default app;
