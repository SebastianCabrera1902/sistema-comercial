/**
 * Borra la base LOCAL para empezar de cero (solo desarrollo).
 * Uso: pnpm run db:reset  (borra, migra y vuelve a cargar los datos de prueba)
 */
import "dotenv/config";
import { existsSync, rmSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:local.db";
if (!url.startsWith("file:")) {
  console.error("db:reset solo funciona con una base local (file:...). No se toca Turso.");
  process.exit(1);
}
const archivo = url.slice("file:".length);
for (const sufijo of ["", "-shm", "-wal", "-journal"]) {
  if (existsSync(archivo + sufijo)) rmSync(archivo + sufijo);
}
console.log(`✓ Base local ${archivo} borrada`);
