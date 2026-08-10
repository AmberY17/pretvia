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

// In-flight bootstrap, if any. Held so concurrent getDb() calls share one attempt
// rather than each kicking off their own.
let _indexBootstrap: Promise<void> | null = null;
// Latched only once every index has actually been created. A failed attempt
// (typically a unique index colliding with existing duplicates) leaves this false
// so the next request retries instead of silently running without the index for
// the lifetime of the process.
let _indexesBootstrapped = false;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db("pretvia");
  // Ensure indexes in the background — imported lazily to avoid a circular
  // dependency between mongodb.ts and ensure-indexes.ts. Deliberately not awaited:
  // index creation must not sit in the latency path of every request.
  if (!_indexesBootstrapped && !_indexBootstrap) {
    _indexBootstrap = import("@/lib/ensure-indexes")
      .then(({ ensureIndexes }) => ensureIndexes())
      .then((ok) => {
        if (ok) _indexesBootstrapped = true;
      })
      .catch((err) => {
        // ensureIndexes reports its own failures to Sentry; this catch only covers
        // the dynamic import itself.
        console.error("index bootstrap failed:", err);
      })
      .finally(() => {
        _indexBootstrap = null;
      });
  }
  return db;
}
