import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { DATA_DIR, DATABASE_URL, MIGRATIONS_DIR } from "../lib/paths";
import * as schema from "./schema";

function connect() {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = drizzle(createClient({ url: DATABASE_URL }), { schema });
  // Bring the schema up to date once per process.
  const ready = migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db, ready };
}

// Dev hot reloads re-evaluate modules: keep a single connection per process.
const globalForDb = globalThis as unknown as { lumenDb?: ReturnType<typeof connect> };
const connection = (globalForDb.lumenDb ??= connect());

export async function getDb() {
  await connection.ready;
  return connection.db;
}

export { schema };
