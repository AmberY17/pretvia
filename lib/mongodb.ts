import { MongoClient, type Db } from "mongodb";
import { validateEnv } from "@/lib/env";

validateEnv();

// validateEnv() above guarantees MONGODB_URI is set
const uri = process.env.MONGODB_URI as string;
const options: Record<string, unknown> = {
  // Disable automatic IPv4/IPv6 family selection — the sandbox's IPv6
  // path triggers an OpenSSL TLS handshake failure with Atlas.
  autoSelectFamily: false,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  // Serverless: each function instance shares one pool; multiple instances
  // run concurrently, so keep per-instance pool small to avoid exhausting
  // Atlas connection limits.
  maxPoolSize: 10,
  minPoolSize: 0,
  waitQueueTimeoutMS: 5000,
};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

// Cache the client promise on the global object so it is reused across
// requests within the same function instance (both dev and production).
if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
}

const clientPromise: Promise<MongoClient> = globalWithMongo._mongoClientPromise;

export default clientPromise;

let _indexesBootstrapped = false;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db("pretvia");
  // Ensure indexes once per process lifetime — imported lazily to avoid a
  // circular dependency between mongodb.ts and ensure-indexes.ts.
  if (!_indexesBootstrapped) {
    _indexesBootstrapped = true;
    import("@/lib/ensure-indexes").then(({ ensureIndexes }) => ensureIndexes()).catch(() => {});
  }
  return db;
}
