import cron from "node-cron";
import { col } from "../config/db.js";
import { todayStr } from "../utils/helpers.js";
import { notifyBookingCompleted } from "../services/mailer.js";

// Marks confirmed bookings whose end date has passed as completed and emails both parties.
export async function completeFinishedBookings() {
  const bookings = await col("bookings");
  const due = await bookings.find({ bookingStatus: "confirmed", endDate: { $lt: todayStr() } }).toArray();
  for (const booking of due) {
    const r = await bookings.updateOne(
      { _id: booking._id, bookingStatus: "confirmed" },
      { $set: { bookingStatus: "completed", completedAt: new Date() } },
    );
    if (r.modifiedCount) await notifyBookingCompleted(booking);
  }
  return due.length;
}

// Persistent schedule for long-running hosts (Vercel uses the /api/cron route instead).
export function startBookingCron() {
  cron.schedule("0 * * * *", async () => {
    try {
      const n = await completeFinishedBookings();
      if (n) console.log(`[cron] completed ${n} booking(s)`);
    } catch (err) {
      console.error("[cron] failed:", err.message);
    }
  });
  console.log("[cron] booking status job scheduled (hourly)");
}
