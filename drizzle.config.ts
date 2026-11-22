import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Las migraciones se generan en /drizzle y se aplican con `pnpm run db:migrate`.
// El dialecto "turso" sirve tanto para el archivo local como para Turso.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
});
