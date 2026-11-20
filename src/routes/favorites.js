import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyRenter } from "../middleware/auth.js";
import { toObjectId, wrap } from "../utils/helpers.js";

const router = Router();
router.use(verifyToken, verifyRenter);

router.get("/", wrap(async (req, res) => {
  const favs = await (await col("favorites")).find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
  const ids = favs.map((f) => toObjectId(f.equipmentId)).filter(Boolean);
  const items = await (await col("equipment")).find({ _id: { $in: ids } }).toArray();
  const byId = new Map(items.map((i) => [String(i._id), i]));
  res.json(favs.map((f) => byId.get(f.equipmentId)).filter(Boolean));
}));

router.get("/ids", wrap(async (req, res) => {
  const favs = await (await col("favorites")).find({ userEmail: req.user.email }).toArray();
  res.json(favs.map((f) => f.equipmentId));
}));

router.post("/", wrap(async (req, res) => {
  const { equipmentId } = req.body;
  const _id = toObjectId(equipmentId);
  if (!_id) return res.status(400).json({ message: "Invalid equipment id" });
  const item = await (await col("equipment")).findOne({ _id, status: "approved" });
  if (!item) return res.status(404).json({ message: "Equipment not found" });
  await (await col("favorites")).updateOne(
    { userEmail: req.user.email, equipmentId: String(_id) },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  res.status(201).json({ message: "Added to favorites" });
}));

router.delete("/:equipmentId", wrap(async (req, res) => {
  await (await col("favorites")).deleteOne({ userEmail: req.user.email, equipmentId: req.params.equipmentId });
  res.json({ message: "Removed from favorites" });
}));

export default router;
