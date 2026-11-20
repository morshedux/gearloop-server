import { Router } from "express";
import { col } from "../config/db.js";
import { verifyToken, verifyOwner, verifyAdmin } from "../middleware/auth.js";
import { wrap } from "../utils/helpers.js";

const router = Router();

// Last 6 calendar months as { key: "2026-11", label: "Nov" }
function lastMonths(n = 6) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) });
  }
  return out;
}

const monthlySeries = (months, rows, fields) =>
  months.map((m) => {
    const row = rows.find((r) => r._id === m.key) || {};
    return { month: m.label, ...Object.fromEntries(fields.map((f) => [f, row[f] || 0])) };
  });

router.get("/admin", verifyToken, verifyAdmin, wrap(async (_req, res) => {
  const [users, equipment, bookings, payments] = await Promise.all([col("user"), col("equipment"), col("bookings"), col("payments")]);
  const months = lastMonths();
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));

  const [totalUsers, totalEquipment, totalBookings, pendingApprovals, completedRentals, revenueRows, monthly, byCategory, byStatus] = await Promise.all([
    users.countDocuments({}),
    equipment.countDocuments({}),
    bookings.countDocuments({}),
    equipment.countDocuments({ status: "pending" }),
    bookings.countDocuments({ bookingStatus: "completed" }),
    payments.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
    bookings.aggregate([
      { $match: { bookingDate: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$bookingDate" } }, bookings: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
    ]).toArray(),
    equipment.aggregate([{ $group: { _id: "$category", value: { $sum: 1 } } }, { $sort: { value: -1 } }]).toArray(),
    equipment.aggregate([{ $group: { _id: "$status", value: { $sum: 1 } } }]).toArray(),
  ]);

  res.json({
    totals: {
      totalUsers, totalEquipment, totalBookings, pendingApprovals, completedRentals,
      totalRevenue: Math.round((revenueRows[0]?.total || 0) * 100) / 100,
    },
    monthly: monthlySeries(months, monthly, ["bookings", "revenue"]),
    byCategory: byCategory.map((c) => ({ name: c._id, value: c.value })),
    byStatus: byStatus.map((s) => ({ name: s._id, value: s.value })),
  });
}));

router.get("/owner", verifyToken, verifyOwner, wrap(async (req, res) => {
  const ownerEmail = req.user.email;
  const [equipment, bookings, payments] = await Promise.all([col("equipment"), col("bookings"), col("payments")]);
  const months = lastMonths();
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));

  const [totalListed, approved, completedRentals, activeRentals, earningsRows, monthly, topItems] = await Promise.all([
    equipment.countDocuments({ ownerEmail }),
    equipment.countDocuments({ ownerEmail, status: "approved" }),
    bookings.countDocuments({ ownerEmail, bookingStatus: "completed" }),
    bookings.countDocuments({ ownerEmail, bookingStatus: "confirmed" }),
    payments.aggregate([{ $match: { ownerEmail, status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
    payments.aggregate([
      { $match: { ownerEmail, paidAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, earnings: { $sum: "$amount" }, rentals: { $sum: 1 } } },
    ]).toArray(),
    bookings.aggregate([
      { $match: { ownerEmail } },
      { $group: { _id: "$equipmentName", earnings: { $sum: "$totalAmount" }, rentals: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
    ]).toArray(),
  ]);

  res.json({
    totals: {
      totalListed, approved, completedRentals, activeRentals,
      totalEarnings: Math.round((earningsRows[0]?.total || 0) * 100) / 100,
    },
    monthly: monthlySeries(months, monthly, ["earnings", "rentals"]),
    topEquipment: topItems.map((t) => ({ name: t._id, earnings: t.earnings, rentals: t.rentals })),
  });
}));

export default router;
