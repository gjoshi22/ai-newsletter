import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(databaseUrl: string) {
  if (!pool) {
    pool = new pg.Pool({ connectionString: databaseUrl });
  }
  return pool;
}

export function getDb(databaseUrl: string) {
  if (!db) {
    db = drizzle(getPool(databaseUrl), { schema });
  }
  return db;
}
