import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import { toObjectId, wrap } from "../utils/helpers.js";

const router = Router();
const ROLES = ["customer", "owner", "admin"];
const safe = { projection: { password: 0 } };

// Current user's profile
router.get("/me", verifyToken, wrap(async (req, res) => {
  const user = await (await col("user")).findOne({ email: req.user.email }, safe);
  res.json({
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image || "",
    role: user.role || "customer",
    phone: user.phone || "",
    address: user.address || "",
    createdAt: user.createdAt,
  });
}));

router.patch("/me", verifyToken, wrap(async (req, res) => {
  const { name, image, phone, address } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ message: "Name is required" });
  const update = {
    name: String(name).trim().slice(0, 80),
    image: String(image || "").slice(0, 500),
    phone: String(phone || "").slice(0, 30),
    address: String(address || "").slice(0, 200),
    updatedAt: new Date(),
  };
  await (await col("user")).updateOne({ email: req.user.email }, { $set: update });
  res.json({ message: "Profile updated", ...update });
}));

// Admin: list users
router.get("/", verifyToken, verifyAdmin, wrap(async (_req, res) => {
  const users = await (await col("user")).find({}, safe).sort({ createdAt: -1 }).toArray();
  res.json(users.map((u) => ({
    _id: u._id, name: u.name, email: u.email, image: u.image || "",
    role: u.role || "customer", createdAt: u.createdAt,
  })));
}));

// Admin: change role
router.patch("/:id/role", verifyToken, verifyAdmin, wrap(async (req, res) => {
  const { role } = req.body;
  const _id = toObjectId(req.params.id);
  if (!_id || !ROLES.includes(role)) return res.status(400).json({ message: "Invalid user or role" });
  if (String(_id) === req.user.id) return res.status(400).json({ message: "You cannot change your own role" });
  const result = await (await col("user")).updateOne({ _id }, { $set: { role, updatedAt: new Date() } });
  if (!result.matchedCount) return res.status(404).json({ message: "User not found" });
  res.json({ message: `Role changed to ${role}` });
}));

// Admin: remove user and their sessions
router.delete("/:id", verifyToken, verifyAdmin, wrap(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "Invalid user id" });
  if (String(_id) === req.user.id) return res.status(400).json({ message: "You cannot delete yourself" });
  const users = await col("user");
  const user = await users.findOne({ _id });
  if (!user) return res.status(404).json({ message: "User not found" });
  await users.deleteOne({ _id });
  await (await col("session")).deleteMany({ userId: { $in: [String(_id), _id] } });
  await (await col("account")).deleteMany({ userId: { $in: [String(_id), _id] } });
  res.json({ message: "User removed" });
}));

export default router;
