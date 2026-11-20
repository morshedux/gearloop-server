import { Router } from "express";
import Stripe from "stripe";
import { col } from "../config/db.js";
import { verifyToken, verifyRenter } from "../middleware/auth.js";
import { unitsAvailable } from "../services/availability.js";
import { toObjectId, wrap, isValidRange, calcTotal, todayStr } from "../utils/helpers.js";

const router = Router();
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);
const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:3000").split(",")[0].trim();

// Step 1: validate the request, check availability, create a Stripe Checkout session.
router.post("/checkout", verifyToken, verifyRenter, wrap(async (req, res) => {
  const { equipmentId, startDate, endDate, quantity, phone, address, notes } = req.body;
  const _id = toObjectId(equipmentId);
  const qty = parseInt(quantity);
  if (!_id) return res.status(400).json({ message: "Invalid equipment" });
  if (!isValidRange(startDate, endDate)) return res.status(400).json({ message: "Invalid rental dates" });
  if (startDate < todayStr()) return res.status(400).json({ message: "Start date cannot be in the past" });
  if (!(qty >= 1)) return res.status(400).json({ message: "Quantity must be at least 1" });
  if (!String(phone || "").trim() || !String(address || "").trim()) {
    return res.status(400).json({ message: "Contact number and delivery address are required" });
  }

  const equipment = await (await col("equipment")).findOne({ _id, status: "approved" });
  if (!equipment) return res.status(404).json({ message: "Equipment not found" });
  if (equipment.ownerEmail === req.user.email) return res.status(400).json({ message: "You cannot rent your own equipment" });

  const free = await unitsAvailable(equipment, startDate, endDate);
  if (qty > free) {
    return res.status(409).json({ message: free ? `Only ${free} unit(s) available for these dates` : "Not available for the selected dates" });
  }

  const total = calcTotal(equipment.price, equipment.rentalType, startDate, endDate, qty);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(total * 100),
        product_data: {
          name: `${equipment.name} x${qty}`,
          description: `${startDate} to ${endDate} (${equipment.rentalType} rate)`,
          images: equipment.image?.startsWith("http") ? [equipment.image] : undefined,
        },
      },
    }],
    success_url: `${clientUrl()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl()}/payment/cancel?equipment=${_id}`,
  });

  await (await col("checkouts")).insertOne({
    sessionId: session.id,
    renterEmail: req.user.email,
    renterName: req.user.name,
    equipmentId: String(_id),
    startDate,
    endDate,
    quantity: qty,
    phone: String(phone).trim().slice(0, 30),
    address: String(address).trim().slice(0, 250),
    notes: String(notes || "").trim().slice(0, 500),
    totalAmount: total,
    createdAt: new Date(),
  });

  res.json({ url: session.url, sessionId: session.id, total });
}));

// Step 2: after Stripe redirects back, verify the payment and create booking + payment records.
router.post("/confirm", verifyToken, verifyRenter, wrap(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: "sessionId is required" });

  const bookings = await col("bookings");
  const existing = await bookings.findOne({ sessionId });
  if (existing) {
    if (existing.renterEmail !== req.user.email) return res.status(403).json({ message: "Forbidden" });
    return res.json({ booking: existing, alreadyConfirmed: true });
  }

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return res.status(402).json({ message: "Payment not completed" });

  const draft = await (await col("checkouts")).findOne({ sessionId });
  if (!draft || draft.renterEmail !== req.user.email) return res.status(404).json({ message: "Checkout not found" });

  const equipment = await (await col("equipment")).findOne({ _id: toObjectId(draft.equipmentId) });
  if (!equipment) return res.status(404).json({ message: "Equipment no longer exists" });

  const booking = {
    sessionId,
    equipmentId: draft.equipmentId,
    equipmentName: equipment.name,
    equipmentImage: equipment.image,
    category: equipment.category,
    rentalType: equipment.rentalType,
    pricePerUnit: equipment.price,
    ownerEmail: equipment.ownerEmail,
    ownerName: equipment.ownerName,
    renterEmail: draft.renterEmail,
    renterName: draft.renterName,
    phone: draft.phone,
    address: draft.address,
    notes: draft.notes,
    startDate: draft.startDate,
    endDate: draft.endDate,
    quantity: draft.quantity,
    totalAmount: draft.totalAmount,
    paymentStatus: "paid",
    bookingStatus: "confirmed",
    bookingDate: new Date(),
  };

  let result;
  try {
    result = await bookings.insertOne(booking);
  } catch (err) {
    if (err.code === 11000) return res.json({ booking: await bookings.findOne({ sessionId }), alreadyConfirmed: true });
    throw err;
  }

  await (await col("payments")).insertOne({
    sessionId,
    transactionId: session.payment_intent,
    bookingId: String(result.insertedId),
    equipmentId: draft.equipmentId,
    renterEmail: draft.renterEmail,
    ownerEmail: equipment.ownerEmail,
    amount: draft.totalAmount,
    currency: session.currency,
    status: "paid",
    paidAt: new Date(),
  });

  res.status(201).json({ booking: { ...booking, _id: result.insertedId }, transactionId: session.payment_intent });
}));

export default router;
