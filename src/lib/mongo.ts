import { MongoClient, type Db } from "mongodb";
import { mongoDbName, mongoUri, useMongo } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __ordoMongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __ordoMongoConnecting: Promise<MongoClient> | undefined;
}

/** Serverless-friendly pool: reuse across warm invocations, drop idle sockets quickly. */
export async function getDb(): Promise<Db> {
  if (!useMongo()) {
    throw new Error("MongoDB is not configured (MONGODB_URI missing)");
  }
  const uri = mongoUri();
  if (!global.__ordoMongoClient) {
    if (!global.__ordoMongoConnecting) {
      const client = new MongoClient(uri, {
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 25_000,
        serverSelectionTimeoutMS: 8_000,
        connectTimeoutMS: 8_000,
      });
      global.__ordoMongoConnecting = client.connect().then((c) => {
        global.__ordoMongoClient = c;
        global.__ordoMongoConnecting = undefined;
        return c;
      });
    }
    await global.__ordoMongoConnecting;
  }
  return global.__ordoMongoClient!.db(mongoDbName());
}
