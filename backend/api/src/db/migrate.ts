import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "./client";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = getDb(databaseUrl);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
