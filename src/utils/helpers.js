import { ObjectId } from "mongodb";

export const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const CATEGORIES = [
  "Construction Equipment",
  "Photography Equipment",
  "Vehicles & Transportation",
  "Agriculture Equipment",
  "Electronics",
  "Event Equipment",
];
export const RENTAL_TYPES = ["Daily", "Weekly", "Monthly"];

const DAY = 86400000;
const parse = (s) => Date.parse(`${s}T00:00:00Z`);

export function isValidRange(start, end) {
  const s = parse(start);
  const e = parse(end);
  return !Number.isNaN(s) && !Number.isNaN(e) && e >= s;
}

// Inclusive number of days between two YYYY-MM-DD strings.
export const daysBetween = (start, end) => Math.round((parse(end) - parse(start)) / DAY) + 1;

// Number of billable units for the equipment's rental type.
export function billableUnits(rentalType, start, end) {
  const days = daysBetween(start, end);
  if (rentalType === "Weekly") return Math.ceil(days / 7);
  if (rentalType === "Monthly") return Math.ceil(days / 30);
  return days;
}

export const calcTotal = (price, rentalType, start, end, qty) =>
  Math.round(price * billableUnits(rentalType, start, end) * qty * 100) / 100;

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function pageParams(query, defLimit = 9) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}
