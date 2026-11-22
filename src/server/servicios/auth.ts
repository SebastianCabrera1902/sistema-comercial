/**
 * Servicio de autenticación (RF-U1, RF-U5).
 * Las contraseñas se guardan con hash bcrypt: nunca en texto plano.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { cambiarPasswordSchema, loginSchema } from "@/lib/esquemas";
import { ApiError, errores } from "../errores";
import type { UsuarioSesion } from "../permisos";
import { validar } from "../validar";

const RONDAS_BCRYPT = 10;

export const hashPassword = (plano: string) => bcrypt.hash(plano, RONDAS_BCRYPT);

/**
 * RF-U1. Verifica email y contraseña. Devuelve el mismo error si el email no
 * existe, si la contraseña no coincide o si el usuario está inactivo, para no
 * dar pistas a quien intenta adivinar cuentas.
 */
export async function login(entrada: unknown): Promise<UsuarioSesion> {
  const datos = validar(loginSchema, entrada);
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, datos.email));

  const valido =
    usuario && usuario.activo && (await bcrypt.compare(datos.password, usuario.passwordHash));
  if (!valido) {
    throw new ApiError(401, "CREDENCIALES_INVALIDAS", "El email o la contraseña no son correctos.");
  }
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

/** RF-U5. Cada usuario cambia su propia contraseña conociendo la actual. */
export async function cambiarPassword(usuario: UsuarioSesion, entrada: unknown): Promise<void> {
  const datos = validar(cambiarPasswordSchema, entrada);
  const [fila] = await db.select().from(usuarios).where(eq(usuarios.id, usuario.id));
  if (!fila) throw errores.noAutenticado();

  if (!(await bcrypt.compare(datos.actual, fila.passwordHash))) {
    throw new ApiError(422, "CONTRASENA_ACTUAL_INCORRECTA", "La contraseña actual no es correcta.", [
      { campo: "actual", mensaje: "La contraseña actual no es correcta." },
    ]);
  }
  await db
    .update(usuarios)
    .set({ passwordHash: await hashPassword(datos.nueva) })
    .where(eq(usuarios.id, usuario.id));
}
