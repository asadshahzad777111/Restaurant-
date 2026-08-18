import { MongoClient, type Db } from "mongodb";
import { mongoDbName, mongoUri, useMongo } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __ordoMongoClient: MongoClient | undefined;
}

export async function getDb(): Promise<Db> {
  if (!useMongo()) {
    throw new Error("MongoDB is not configured (MONGODB_URI missing)");
  }
  const uri = mongoUri();
  if (!global.__ordoMongoClient) {
    global.__ordoMongoClient = new MongoClient(uri);
    await global.__ordoMongoClient.connect();
  }
  return global.__ordoMongoClient.db(mongoDbName());
}
