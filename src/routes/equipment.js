import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyOwner, verifyAdmin, verifyOwnerOrAdmin } from "../middleware/auth.js";
import { toObjectId, wrap, pageParams, CATEGORIES, RENTAL_TYPES } from "../utils/helpers.js";

const router = Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function validate(body) {
  const errors = [];
  const str = (k) => String(body[k] ?? "").trim();
  const price = Number(body.price);
  const quantity = parseInt(body.quantity);
  if (str("name").length < 3) errors.push("Equipment name is required");
  if (str("description").length < 10) errors.push("Description must be at least 10 characters");
  if (!CATEGORIES.includes(str("category"))) errors.push("Invalid category");
  if (!RENTAL_TYPES.includes(str("rentalType"))) errors.push("Invalid rental type");
  if (!str("location")) errors.push("Location is required");
  if (!(price > 0)) errors.push("Price must be greater than 0");
  if (!(quantity >= 0)) errors.push("Quantity must be 0 or more");
  if (!str("image")) errors.push("Equipment image is required");
  if (errors.length) return { errors };
  return {
    data: {
      name: str("name"),
      description: str("description"),
      category: str("category"),
      location: str("location"),
      price,
      rentalType: str("rentalType"),
      quantity,
      condition: str("condition") || "Good",
      brand: str("brand"),
      model: str("model"),
      image: str("image"),
      terms: str("terms") || "Equipment must be returned in the same condition. Late returns may incur extra charges.",
    },
  };
}

// ---- Public listing with server-side search / filter / sort / pagination ----
router.get("/", wrap(async (req, res) => {
  const { search, category, rentalType, minPrice, maxPrice, availability, sort } = req.query;
  const { page, limit, skip } = pageParams(req.query, 9);
  const filter = { status: "approved" };

  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: rx }, { location: rx }, { category: rx }];
  }
  if (category && category !== "all") filter.category = category;
  if (rentalType && rentalType !== "all") filter.rentalType = rentalType;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice !== undefined && minPrice !== "") filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "") filter.price.$lte = Number(maxPrice);
  }
  if (availability === "available") filter.quantity = { $gt: 0 };
  if (availability === "unavailable") filter.quantity = { $lte: 0 };

  const sortMap = {
    "price-asc": { price: 1, _id: 1 },
    "price-desc": { price: -1, _id: 1 },
    newest: { createdAt: -1, _id: -1 },
  };
  const equipment = await col("equipment");
  const [items, total] = await Promise.all([
    equipment.find(filter).sort(sortMap[sort] || sortMap.newest).skip(skip).limit(limit).toArray(),
    equipment.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

// Home page: 6 approved items using $limit
router.get("/featured", wrap(async (_req, res) => {
  const items = await (await col("equipment"))
    .aggregate([{ $match: { status: "approved", quantity: { $gt: 0 } } }, { $sort: { rating: -1, createdAt: -1 } }, { $limit: 6 }])
    .toArray();
  res.json(items);
}));

router.get("/recent", wrap(async (_req, res) => {
  const items = await (await col("equipment"))
    .aggregate([{ $match: { status: "approved" } }, { $sort: { createdAt: -1 } }, { $limit: 4 }])
    .toArray();
  res.json(items);
}));

router.get("/categories", wrap(async (_req, res) => {
  const rows = await (await col("equipment"))
    .aggregate([{ $match: { status: "approved" } }, { $group: { _id: "$category", count: { $sum: 1 } } }])
    .toArray();
  const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  res.json(CATEGORIES.map((name) => ({ name, count: counts[name] || 0 })));
}));

// ---- Owner ----
router.get("/mine", verifyToken, verifyOwner, wrap(async (req, res) => {
  const items = await (await col("equipment")).find({ ownerEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
  res.json(items);
}));

router.post("/", verifyToken, verifyOwner, wrap(async (req, res) => {
  const { data, errors } = validate(req.body);
  if (errors) return res.status(400).json({ message: errors[0], errors });
  const doc = {
    ...data,
    status: "pending",
    ownerEmail: req.user.email,
    ownerName: req.user.name,
    ownerImage: req.user.image,
    rating: 0,
    createdAt: new Date(),
  };
  const result = await (await col("equipment")).insertOne(doc);
  res.status(201).json({ message: "Equipment submitted for approval", _id: result.insertedId });
}));

// ---- Admin ----
router.get("/admin/all", verifyToken, verifyAdmin, wrap(async (_req, res) => {
  res.json(await (await col("equipment")).find({}).sort({ createdAt: -1 }).toArray());
}));

router.patch("/:id/status", verifyToken, verifyAdmin, wrap(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const { status } = req.body;
  if (!_id || !["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid id or status" });
  }
  const r = await (await col("equipment")).updateOne({ _id }, { $set: { status, reviewedAt: new Date() } });
  if (!r.matchedCount) return res.status(404).json({ message: "Equipment not found" });
  res.json({ message: `Equipment ${status}` });
}));

// ---- Shared ----
router.get("/:id", verifyToken, wrap(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "Invalid equipment id" });
  const item = await (await col("equipment")).findOne({ _id });
  if (!item) return res.status(404).json({ message: "Equipment not found" });
  const privileged = req.user.role === "admin" || item.ownerEmail === req.user.email;
  if (item.status !== "approved" && !privileged) return res.status(404).json({ message: "Equipment not found" });
  const owner = await (await col("user")).findOne(
    { email: item.ownerEmail },
    { projection: { name: 1, email: 1, image: 1, phone: 1, address: 1, createdAt: 1 } },
  );
  res.json({ ...item, owner: owner || { name: item.ownerName, email: item.ownerEmail, image: item.ownerImage } });
}));

router.put("/:id", verifyToken, verifyOwnerOrAdmin, wrap(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "Invalid equipment id" });
  const equipment = await col("equipment");
  const item = await equipment.findOne({ _id });
  if (!item) return res.status(404).json({ message: "Equipment not found" });
  if (req.user.role !== "admin" && item.ownerEmail !== req.user.email) {
    return res.status(403).json({ message: "You can only edit your own equipment" });
  }
  const { data, errors } = validate(req.body);
  if (errors) return res.status(400).json({ message: errors[0], errors });
  await equipment.updateOne({ _id }, { $set: { ...data, updatedAt: new Date() } });
  res.json({ message: "Equipment updated" });
}));

router.delete("/:id", verifyToken, verifyOwnerOrAdmin, wrap(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) return res.status(400).json({ message: "Invalid equipment id" });
  const equipment = await col("equipment");
  const item = await equipment.findOne({ _id });
  if (!item) return res.status(404).json({ message: "Equipment not found" });
  if (req.user.role !== "admin" && item.ownerEmail !== req.user.email) {
    return res.status(403).json({ message: "You can only delete your own equipment" });
  }
  await equipment.deleteOne({ _id });
  await (await col("favorites")).deleteMany({ equipmentId: String(_id) });
  res.json({ message: "Equipment deleted" });
}));

export default router;
