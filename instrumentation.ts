// Runs once when the server starts, before it handles any request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Local development without DATABASE_URL uses an embedded database; create
  // or update its tables automatically so `npm run dev` just works.
  if (!process.env.DATABASE_URL && !process.env.VERCEL) {
    const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/pglite";
    try {
      const { migrateLocalDatabase } = await import("./lib/server/db");
      await migrateLocalDatabase();
      console.log(`Using the embedded PGlite database in ${dataDir} (set DATABASE_URL to use Postgres).`);
    } catch (error) {
      console.error(
        `\nCouldn't open the embedded database in ${dataDir}. If the server was force-stopped while writing, ` +
          `its files can be damaged: delete that folder to start fresh (local data will be lost), or set DATABASE_URL to use Postgres.\n`,
      );
      throw error;
    }
  }
}
