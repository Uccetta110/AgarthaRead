import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

// Carica manualmente il file .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const globalForDb = globalThis as typeof globalThis & {
  __agarthaMysqlPool?: mysql.Pool;
};

function getDatabaseUrl() {
  // A questo punto, process.env.DATABASE_URL dovrebbe essere caricato da dotenv
  const url = process.env.DATABASE_URL?.trim();
  return url || "";
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
