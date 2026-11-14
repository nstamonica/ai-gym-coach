import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/server/db/schema";
import type { Database } from "@/lib/server/db";

/** A fresh in-memory Postgres with the app's real migrations applied. */
export async function createTestDb(): Promise<Database> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

let counter = 0;

/** Inserts a user and returns its id. */
export async function createUser(db: Database, name = "Test Lifter"): Promise<string> {
  const id = `user_${++counter}_${Math.random().toString(36).slice(2, 10)}`;
  await db.insert(schema.user).values({
    id,
    name,
    email: `${id}@example.com`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

/** Values for a new pending analysis owned by `userId`. */
export function newAnalysis(userId: string, overrides: Partial<{ notes: string | null; thumbnail: Uint8Array | null }> = {}) {
  const id = crypto.randomUUID();
  return {
    id,
    userId,
    geminiFile: `files/${id}`,
    videoName: "squat.mp4",
    videoBytes: 1_000_000,
    videoSeconds: 12,
    notes: null,
    thumbnail: null,
    ...overrides,
  };
}
