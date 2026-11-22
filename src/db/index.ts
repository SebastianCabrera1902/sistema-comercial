/**
 * Conexión a la base de datos.
 *
 * Se usa el mismo driver (libSQL) para desarrollo y producción; lo único que
 * cambia es la URL de la variable de entorno DATABASE_URL:
 *   - En desarrollo:  file:local.db            (archivo SQLite local)
 *   - En producción:  libsql://<base>.turso.io  (Turso, con DATABASE_AUTH_TOKEN)
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:local.db";

const cliente = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

export const db = drizzle(cliente, { schema });

/** Qué base está usando la aplicación (se muestra al admin en /perfil). */
export const origenBaseDeDatos = url.startsWith("file:")
  ? `SQLite local (${url.slice(5)})`
  : `Turso (${url.replace(/^libsql:\/\//, "").split("?")[0]})`;

/** Transacción en curso (lo que recibe el callback de db.transaction). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Cualquier cosa con la que se pueda consultar: la base o una transacción. */
export type Ejecutor = typeof db | Tx;
