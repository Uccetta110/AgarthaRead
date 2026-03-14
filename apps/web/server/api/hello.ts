import { sql } from "drizzle-orm";
import { getDb } from "../db/client";

export default defineEventHandler(async () => {
	const db = getDb();
	await db.execute(sql`SELECT 1`);

	return {
		ok: true,
		database: "connected",
	};
});

