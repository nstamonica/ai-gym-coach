import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Read .env.local the same way Next.js does.
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  // Without DATABASE_URL the app uses an embedded PGlite database, so point the
  // CLI (e.g. `npm run db:studio`) at the same files. Stop `npm run dev` first.
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? "./.data/pglite" } }),
});
