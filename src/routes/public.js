import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyRenter } from "../middleware/auth.js";
import { wrap } from "../utils/helpers.js";

const router = Router();

router.get("/reviews", wrap(async (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit) || 6);
  res.json(await (await col("reviews")).find({}).sort({ createdAt: -1 }).limit(limit).toArray());
}));

router.post("/reviews", verifyToken, verifyRenter, wrap(async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();
  if (!(rating >= 1 && rating <= 5) || comment.length < 5) {
    return res.status(400).json({ message: "Provide a rating (1-5) and a short comment" });
  }
  await (await col("reviews")).insertOne({
    name: req.user.name,
    image: req.user.image,
    role: "Renter",
    rating: Math.round(rating),
    comment: comment.slice(0, 400),
    createdAt: new Date(),
  });
  res.status(201).json({ message: "Thanks for your review!" });
}));

router.get("/stats", wrap(async (_req, res) => {
  const [equipment, users, bookings, owners] = await Promise.all([
    (await col("equipment")).countDocuments({ status: "approved" }),
    (await col("user")).countDocuments({}),
    (await col("bookings")).countDocuments({}),
    (await col("user")).countDocuments({ role: "owner" }),
  ]);
  res.json({ equipment, users, bookings, owners });
}));

router.get("/owners/top", wrap(async (_req, res) => {
  const rows = await (await col("equipment"))
    .aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$ownerEmail", name: { $first: "$ownerName" }, image: { $first: "$ownerImage" }, listings: { $sum: 1 }, location: { $first: "$location" } } },
      { $sort: { listings: -1 } },
      { $limit: 4 },
    ])
    .toArray();
  res.json(rows);
}));

export default router;
