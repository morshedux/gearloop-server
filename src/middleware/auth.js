import jwt from "jsonwebtoken";
import { col } from "../config/db.js";

// Verifies the Bearer JWT and loads the up-to-date user (and role) from MongoDB.
export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized: token missing" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const users = await col("user");
    const user = await users.findOne({ email: payload.email });
    if (!user) return res.status(401).json({ message: "Unauthorized: user not found" });
    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      image: user.image || "",
      role: user.role || "customer",
    };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Forbidden: requires ${roles.join(" or ")} role` });
  }
  next();
};

export const verifyRenter = requireRole("customer");
export const verifyOwner = requireRole("owner");
export const verifyAdmin = requireRole("admin");
export const verifyOwnerOrAdmin = requireRole("owner", "admin");
