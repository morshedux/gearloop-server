import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyRenter, verifyOwner, verifyAdmin } from "../middleware/auth.js";
import { wrap, pageParams } from "../utils/helpers.js";

const router = Router();

async function paged(filter, req, res) {
  const { page, limit, skip } = pageParams(req.query, 10);
  const bookings = await col("bookings");
  const [items, total] = await Promise.all([
    bookings.find(filter).sort({ bookingDate: -1 }).skip(skip).limit(limit).toArray(),
    bookings.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// Renter: my rentals
router.get("/mine", verifyToken, verifyRenter, wrap((req, res) => paged({ renterEmail: req.user.email }, req, res)));

// Owner: rentals of my equipment
router.get("/owner", verifyToken, verifyOwner, wrap((req, res) => paged({ ownerEmail: req.user.email }, req, res)));

// Admin: every rental
router.get("/", verifyToken, verifyAdmin, wrap((req, res) => paged({}, req, res)));

export default router;
