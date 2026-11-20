// Seeds demo equipment, reviews and sample booking history.
// Usage: npm run seed   (re-running replaces previously seeded documents only)
import "dotenv/config";
import { getDb } from "../src/config/db.js";

const OWNERS = {
  hasan: { email: "owner@gearloop.demo", name: "Rafiq Hasan" },
  karim: { email: "owner2@gearloop.demo", name: "Nadia Karim" },
};
const RENTER = { email: "customer@gearloop.demo", name: "Tanvir Ahmed" };

const L = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Gazipur"];
const img = (k) => `/equipment/${k}.jpg`;

const items = [
  // Construction Equipment
  ["Caterpillar 320 Excavator", "Construction Equipment", "excavator", 420, "Daily", 3, "Excellent", "Caterpillar", "320 GC", L[0], "hasan", "Hydraulic excavator with operator-ready cab, ideal for foundation digging, trenching and site grading. Includes bucket and fuel-efficient engine."],
  ["Concrete Mixer Truck 8m³", "Construction Equipment", "mixer", 310, "Daily", 4, "Good", "Hino", "FM8J", L[1], "hasan", "Eight cubic metre drum mixer truck for on-site concrete delivery. Driver available on request."],
  ["Heavy Duty Scaffolding Set", "Construction Equipment", "scaffold", 95, "Weekly", 20, "Good", "Layher", "Allround", L[0], "hasan", "Galvanised modular scaffolding set covering up to 120 sqm of facade, with base plates and safety rails."],
  ["Vibratory Plate Compactor", "Construction Equipment", "compactor", 55, "Daily", 6, "Excellent", "Wacker Neuson", "WP1550", L[5], "hasan", "Reversible plate compactor for soil, gravel and asphalt, delivers consistent compaction on driveways and roads."],
  // Photography Equipment
  ["Canon EOS 7D DSLR Kit", "Photography Equipment", "dslr", 35, "Daily", 5, "Good", "Canon", "EOS 7D", L[0], "karim", "Fast burst-shooting DSLR with 18-135mm lens, two batteries and a 64GB card. Great for events and sports."],
  ["300mm Telephoto Lens", "Photography Equipment", "lens", 28, "Daily", 3, "Excellent", "Sigma", "300mm f/4", L[0], "karim", "Sharp telephoto prime for wildlife, sports and portrait compression. Includes hood and padded case."],
  ["DJI Phantom 4 Pro Drone", "Photography Equipment", "drone", 60, "Daily", 4, "Excellent", "DJI", "Phantom 4 Pro", L[2], "karim", "4K aerial drone with obstacle sensing, three batteries and a carry case. Licensed pilot tips included."],
  ["Studio Lighting Kit", "Photography Equipment", "softbox", 120, "Weekly", 6, "Good", "Godox", "SL-60 Kit", L[1], "karim", "Three-light continuous kit with softboxes, stands and reflectors for portrait and product photography."],
  // Vehicles & Transportation
  ["Ford Ranger Wildtrak Pickup", "Vehicles & Transportation", "pickup", 85, "Daily", 3, "Excellent", "Ford", "Ranger Wildtrak", L[0], "hasan", "Powerful 4x4 double-cab pickup for site visits and rough roads. Fuel not included."],
  ["Ford Transit Cargo Van", "Vehicles & Transportation", "van", 70, "Daily", 4, "Good", "Ford", "Transit Connect", L[1], "hasan", "Spacious cargo van for deliveries and relocation with 3.6 cubic metres of load space."],
  ["Honda CD 70 Motorcycle", "Vehicles & Transportation", "motorbike", 140, "Monthly", 10, "Good", "Honda", "CD 70", L[3], "hasan", "Reliable commuter motorbike with helmet and insurance cover, perfect for monthly city travel."],
  ["3-Tonne Warehouse Forklift", "Vehicles & Transportation", "forklift", 190, "Weekly", 2, "Excellent", "Toyota", "8FD30", L[5], "hasan", "Diesel forklift with side-shift and 4.5 m mast, certified and serviced monthly."],
  // Agriculture Equipment
  ["Mahindra 575 Tractor", "Agriculture Equipment", "tractor", 160, "Daily", 3, "Good", "Mahindra", "575 DI", L[3], "hasan", "45 HP tractor suitable for ploughing, hauling and trailer work. Implements available separately."],
  ["Power Tiller 12HP", "Agriculture Equipment", "tiller", 450, "Monthly", 8, "Good", "Kubota", "DC-12", L[4], "hasan", "Compact diesel tiller for small and medium farms, easy to operate and maintain."],
  ["Irrigation Water Pump 5HP", "Agriculture Equipment", "pump", 75, "Weekly", 9, "Excellent", "Honda", "WB30", L[4], "hasan", "High-flow centrifugal pump delivering 1,000 litres per minute, includes hoses and fittings."],
  ["Combine Harvester", "Agriculture Equipment", "harvester", 650, "Daily", 1, "Excellent", "Kubota", "DC-70G", L[3], "hasan", "Self-propelled rice and wheat combine harvester with an experienced operator option."],
  // Electronics
  ["Full HD Projector 4000 Lumens", "Electronics", "projector", 25, "Daily", 8, "Good", "Epson", "H428B", L[0], "karim", "Bright projector for classrooms, seminars and movie nights with HDMI cable and screen stand."],
  ["High-Performance Laptop Workstation", "Electronics", "laptop", 210, "Weekly", 5, "Excellent", "Lenovo", "ThinkPad X1", L[0], "karim", "Core i7, 32GB RAM, 1TB SSD, ideal for editing, rendering and temporary project work."],
  ["Desktop 3D Printer", "Electronics", "printer3d", 150, "Weekly", 3, "Good", "Creality", "Ender 3 V2", L[1], "karim", "Reliable FDM printer with 220x220x250 mm volume. Starter PLA filament included."],
  ["27-inch 4K Monitor", "Electronics", "monitor", 360, "Monthly", 7, "Excellent", "Dell", "U2723QE", L[2], "karim", "Colour-accurate IPS 4K monitor with USB-C docking, perfect for designers and editors."],
  // Event Equipment
  ["Concert PA Speaker System", "Event Equipment", "speaker", 180, "Daily", 4, "Excellent", "JBL", "PRX812", L[0], "karim", "Powered speaker pair with stands, mixer and cables for parties, concerts and conferences up to 500 guests."],
  ["Wedding Marquee Tent 10x20m", "Event Equipment", "tent", 260, "Daily", 5, "Good", "Rhc", "Pro Marquee", L[0], "karim", "Weatherproof marquee with side panels and flooring options, seats 150 guests."],
  ["LED Video Wall 4x3m", "Event Equipment", "ledscreen", 520, "Daily", 2, "Excellent", "Absen", "A27", L[1], "karim", "Modular indoor LED wall with processor and rigging, perfect for stages and expos."],
  ["Stage Lighting and Truss Package", "Event Equipment", "stagelight", 340, "Daily", 3, "Excellent", "Chauvet", "Rogue R2", L[0], "karim", "Moving-head lights with aluminium truss, DMX controller and technician support."],
];

const reviews = [
  ["Tanvir Ahmed", "Renter", 5, "Rented an excavator for a three-day foundation job. The machine arrived on time and the owner was extremely professional."],
  ["Mitu Akter", "Wedding Planner", 5, "The marquee and sound system made our client's wedding flawless. Booking and payment took only a few minutes."],
  ["Sabbir Rahman", "Photographer", 4, "Got a drone and a telephoto lens for a weekend shoot. Equipment was clean, charged and exactly as described."],
  ["Farhana Islam", "Farm Owner", 5, "Hiring a power tiller monthly saved me a lot compared with buying. The platform made everything clear and transparent."],
  ["Imran Hossain", "Contractor", 4, "Scaffolding for a six-storey building arrived complete. Pricing was fair and the support team answered quickly."],
  ["Lamia Chowdhury", "Event Organizer", 5, "Verified owners and secure Stripe payment gave us confidence. We will rent from GearLoop again for every event."],
];

const db = await getDb();
const now = Date.now();
const day = 86400000;

await Promise.all(["equipment", "reviews", "bookings", "payments"].map((c) => db.collection(c).deleteMany({ seed: true })));

const equipmentDocs = items.map((it, i) => ({
  name: it[0], category: it[1], image: img(it[2]), price: it[3], rentalType: it[4], quantity: it[5],
  condition: it[6], brand: it[7], model: it[8], location: it[9],
  ownerEmail: OWNERS[it[10]].email, ownerName: OWNERS[it[10]].name, ownerImage: "",
  description: it[11],
  terms: "A refundable security deposit may be required on pickup. Equipment must be returned clean and in the same condition. Late returns are charged at the daily rate.",
  status: "approved", rating: Math.round((4 + ((i * 7) % 10) / 10) * 10) / 10,
  createdAt: new Date(now - i * day * 2), seed: true,
}));
const { insertedIds } = await db.collection("equipment").insertMany(equipmentDocs);

await db.collection("reviews").insertMany(
  reviews.map((r, i) => ({ name: r[0], role: r[1], rating: r[2], comment: r[3], image: "", createdAt: new Date(now - i * day), seed: true })),
);

// Sample booking history for the dashboard charts (completed and paid).
const bookings = [];
const payments = [];
for (let m = 5; m >= 0; m--) {
  const count = 2 + ((m * 3) % 4);
  for (let k = 0; k < count; k++) {
    const idx = (m * 5 + k * 3) % equipmentDocs.length;
    const eq = { ...equipmentDocs[idx], _id: insertedIds[idx] };
    const qty = 1 + (k % 2);
    const units = eq.rentalType === "Daily" ? 2 + k : 1 + (k % 2);
    const total = Math.round(eq.price * units * qty * 100) / 100;
    const booked = new Date(now - m * 30 * day - k * 3 * day);
    const start = new Date(booked.getTime() + day);
    const end = new Date(start.getTime() + units * day);
    const sessionId = `seed_${m}_${k}`;
    bookings.push({
      sessionId, equipmentId: String(eq._id), equipmentName: eq.name, equipmentImage: eq.image, category: eq.category,
      rentalType: eq.rentalType, pricePerUnit: eq.price, ownerEmail: eq.ownerEmail, ownerName: eq.ownerName,
      renterEmail: RENTER.email, renterName: RENTER.name, phone: "01700000000", address: "House 12, Road 5, Dhanmondi, Dhaka",
      notes: "", startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), quantity: qty, totalAmount: total,
      paymentStatus: "paid", bookingStatus: m === 0 && k === 0 ? "confirmed" : "completed", bookingDate: booked, seed: true,
    });
    payments.push({
      sessionId, transactionId: `pi_seed_${m}_${k}`, equipmentId: String(eq._id), renterEmail: RENTER.email,
      ownerEmail: eq.ownerEmail, amount: total, currency: "usd", status: "paid", paidAt: booked, seed: true,
    });
  }
}
const inserted = await db.collection("bookings").insertMany(bookings);
payments.forEach((p, i) => (p.bookingId = String(inserted.insertedIds[i])));
await db.collection("payments").insertMany(payments);

console.log(`Seeded ${equipmentDocs.length} equipment, ${reviews.length} reviews, ${bookings.length} bookings.`);
process.exit(0);
