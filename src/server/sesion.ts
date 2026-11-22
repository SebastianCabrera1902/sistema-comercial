/**
 * Sesión del usuario conectado.
 *
 * El usuario se busca en la base EN CADA PEDIDO: si un administrador lo
 * desactiva o le cambia el rol, pierde el acceso de inmediato aunque
 * conserve la cookie (pautas 10.5).
 */
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { COOKIE_SESION, DURACION_SESION_SEG, firmarToken, verificarToken } from "./token";
import type { UsuarioSesion } from "./permisos";

export async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const almacen = await cookies();
  const uid = await verificarToken(almacen.get(COOKIE_SESION)?.value);
  if (!uid) return null;

  const [usuario] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
    })
    .from(usuarios)
    .where(eq(usuarios.id, uid));

  if (!usuario || !usuario.activo) return null;
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

/** Para páginas: si no hay usuario válido, manda al login (segunda barrera). */
export async function exigirUsuarioPagina(): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Abre la sesión: cookie httpOnly, SameSite=Lax, segura en producción. */
export async function abrirSesion(usuarioId: number) {
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, await firmarToken(usuarioId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });
}

export async function cerrarSesion() {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
}
