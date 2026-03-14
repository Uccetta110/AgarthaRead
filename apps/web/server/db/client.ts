import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __agarthaMysqlPool?: mysql.Pool;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? "";
}

function getPool() {
  if (globalForDb.__agarthaMysqlPool) {
    return globalForDb.__agarthaMysqlPool;
  }

  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "DATABASE_URL non impostata",
    });
  }

  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__agarthaMysqlPool = pool;
  }

  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}

export { schema };
