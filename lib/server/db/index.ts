import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

/** Either driver; both expose the same Drizzle query API. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

interface Connection {
  db: Database;
  /** Set for the embedded dev database, which migrates itself on startup. */
  migrateLocal: (() => Promise<void>) | null;
}

// One connection per server process, kept on globalThis so that dev hot reloads
// don't open a second one (PGlite can't share its data directory).
const globalForDb = globalThis as typeof globalThis & { __gymCoachDb?: Connection };

function connect(): Connection {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Any Postgres: Neon, Supabase, RDS or a local server. Use a pooled URL on serverless hosts.
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_SIZE) || 5 });
    return { db: drizzlePostgres(pool, { schema }), migrateLocal: null };
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string to your Vercel environment variables.");
  }

  // No DATABASE_URL: use an embedded Postgres (PGlite) stored on disk, so local
  // development needs no database server. Not meant for production.
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
  // PGlite creates the folder itself, but not its parents. "memory://" keeps everything in memory.
  if (!dataDir.startsWith("memory://")) mkdirSync(path.dirname(dataDir), { recursive: true });
  const local = drizzlePglite(new PGlite(dataDir), { schema });
  return {
    db: local,
    migrateLocal: () => migratePglite(local, { migrationsFolder: path.join(process.cwd(), "drizzle") }),
  };
}

function connection(): Connection {
  globalForDb.__gymCoachDb ??= connect();
  return globalForDb.__gymCoachDb;
}

/**
 * The database. It connects on first use rather than at import time, so that
 * `next build` (which imports every route module) never opens a connection.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const real = connection().db;
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/**
 * Applies pending migrations when using the embedded dev database. Returns false
 * for a real Postgres database, which is migrated explicitly (`npm run db:migrate`).
 */
export async function migrateLocalDatabase(): Promise<boolean> {
  const { migrateLocal } = connection();
  if (!migrateLocal) return false;
  await migrateLocal();
  return true;
}
