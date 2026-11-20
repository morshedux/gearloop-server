import { col } from "../config/db.js";

// Units of an equipment item still free for every day in [start, end].
// Overlapping confirmed bookings reduce the available stock.
export async function unitsAvailable(equipment, start, end) {
  const rows = await (await col("bookings"))
    .aggregate([
      {
        $match: {
          equipmentId: String(equipment._id),
          bookingStatus: "confirmed",
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      },
      { $group: { _id: null, booked: { $sum: "$quantity" } } },
    ])
    .toArray();
  const booked = rows[0]?.booked || 0;
  return Math.max(0, equipment.quantity - booked);
}
