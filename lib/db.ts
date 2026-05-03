import mongoose from "mongoose";

/** Read env at connect time so scripts can `dotenv.config()` after imports. */
function getMongoConfig() {
  return {
    url: process.env.MONGO_URL,
    dbName: process.env.MONGO_DB_NAME ?? "sanaFathimaMansion",
  };
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

export async function connectDb(): Promise<typeof mongoose> {
  const { url, dbName } = getMongoConfig();
  if (!url) {
    throw new Error("MONGO_URL is not set");
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(url, {
      dbName,
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }

  return cache.conn;
}
