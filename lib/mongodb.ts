import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MONGODB_URI to environment variables");
}

const uri = process.env.MONGODB_URI;
const options: Record<string, unknown> = {
  // Disable automatic IPv4/IPv6 family selection — the sandbox's IPv6
  // path triggers an OpenSSL TLS handshake failure with Atlas.
  autoSelectFamily: false,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (process.env.NODE_ENV === "development") {
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("pretvia");
}
