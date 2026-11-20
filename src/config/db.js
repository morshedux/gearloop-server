import { MongoClient } from "mongodb";

let client;
let db;
let indexesReady = false;

export async function getDb() {
  if (db) return db;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  client = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    maxIdleTimeMS: 5000,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  // If the topology ever closes (frozen serverless instance), reconnect on the next request.
  client.on("topologyClosed", () => {
    db = undefined;
    client = undefined;
    indexesReady = false;
  });
  await client.connect();
  db = client.db(process.env.DB_NAME || "gearloop");
  if (!indexesReady) {
    indexesReady = true;
    await Promise.all([
      db.collection("bookings").createIndex({ sessionId: 1 }, { unique: true, sparse: true }),
      db.collection("payments").createIndex({ sessionId: 1 }, { unique: true, sparse: true }),
      db.collection("favorites").createIndex({ userEmail: 1, equipmentId: 1 }, { unique: true }),
      db.collection("equipment").createIndex({ status: 1, createdAt: -1 }),
    ]).catch((e) => console.error("Index creation failed:", e.message));
  }
  return db;
}

export const col = async (name) => (await getDb()).collection(name);
