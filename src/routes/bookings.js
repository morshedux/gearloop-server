import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyRenter, verifyOwner, verifyAdmin } from "../middleware/auth.js";
import { wrap, pageParams, toObjectId } from "../utils/helpers.js";

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

// Admin: manage a rental's booking status
router.patch("/:id/status", verifyToken, verifyAdmin, wrap(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const { status } = req.body;
  if (!_id || !["confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid booking or status" });
  }
  const update = { bookingStatus: status, updatedAt: new Date() };
  if (status === "completed") update.completedAt = new Date();
  const r = await (await col("bookings")).updateOne({ _id }, { $set: update });
  if (!r.matchedCount) return res.status(404).json({ message: "Booking not found" });
  res.json({ message: `Booking marked ${status}` });
}));

export default router;
