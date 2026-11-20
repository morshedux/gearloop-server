import app from "./app.js";
import { getDb } from "./config/db.js";
import { startBookingCron } from "./jobs/completeBookings.js";

const port = process.env.PORT || 5000;

getDb()
  .then(() => {
    app.listen(port, () => console.log(`GearLoop API running on port ${port}`));
    startBookingCron();
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
