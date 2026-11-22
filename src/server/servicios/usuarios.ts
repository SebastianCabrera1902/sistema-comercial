/**
 * Gestión de usuarios (RF-U3, RF-U4, RF-U5). Solo administradores.
 */
import { randomBytes } from "node:crypto";
import { and, count, eq, or, type SQL } from "drizzle-orm";
import { contiene } from "../busqueda";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { paginacionSchema, usuarioAltaSchema, usuarioEdicionSchema } from "@/lib/esquemas";
import { ApiError, errores } from "../errores";
import { exigirRol, type UsuarioSesion } from "../permisos";
import { esErrorUnico, paginado, validar } from "../validar";
import { hashPassword } from "./auth";

/** Forma pública: nunca incluye el hash de la contraseña. */
const columnasPublicas = {
  id: usuarios.id,
  nombre: usuarios.nombre,
  email: usuarios.email,
  rol: usuarios.rol,
  activo: usuarios.activo,
  creadoEn: usuarios.creadoEn,
};

export type UsuarioPublico = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
  activo: boolean;
  creadoEn: string;
};

const filtrosSchema = paginacionSchema.extend({
  q: z.string().trim().optional(),
  activo: z.enum(["true", "false"]).optional(),
});

/** RF-U4. Listado paginado con búsqueda por nombre o email. */
export async function listarUsuarios(usuario: UsuarioSesion, query: unknown) {
  exigirRol(usuario, "admin");
  const f = validar(filtrosSchema, query);

  const condiciones: SQL[] = [];
  if (f.q) {
    condiciones.push(or(contiene(usuarios.nombre, f.q), contiene(usuarios.email, f.q))!);
  }
  if (f.activo) condiciones.push(eq(usuarios.activo, f.activo === "true"));
  const where = condiciones.length ? and(...condiciones) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(usuarios).where(where);
  const data = await db
    .select(columnasPublicas)
    .from(usuarios)
    .where(where)
    .orderBy(usuarios.nombre)
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  return paginado(data, total, f.page, f.pageSize);
}

async function obtener(id: number): Promise<UsuarioPublico> {
  const [fila] = await db.select(columnasPublicas).from(usuarios).where(eq(usuarios.id, id));
  if (!fila) throw errores.noEncontrado("El usuario");
  return fila;
}

const emailDuplicado = () =>
  new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.", [
    { campo: "email", mensaje: "Ya existe un usuario con ese email." },
  ]);

/** RF-U4. Alta de usuario con contraseña temporal. */
export async function crearUsuario(usuario: UsuarioSesion, entrada: unknown) {
  exigirRol(usuario, "admin");
  const datos = validar(usuarioAltaSchema, entrada);
  try {
    const [nuevo] = await db
      .insert(usuarios)
      .values({
        nombre: datos.nombre,
        email: datos.email,
        rol: datos.rol,
        passwordHash: await hashPassword(datos.password),
      })
      .returning({ id: usuarios.id });
    return obtener(nuevo.id);
  } catch (e) {
    if (esErrorUnico(e)) throw emailDuplicado();
    throw e;
  }
}

/**
 * RF-U4. Edición, cambio de rol y desactivación. Un admin no puede
 * desactivarse ni quitarse el rol a sí mismo (quedaría sin administradores).
 */
export async function editarUsuario(usuario: UsuarioSesion, id: number, entrada: unknown) {
  exigirRol(usuario, "admin");
  const datos = validar(usuarioEdicionSchema, entrada);
  await obtener(id);

  if (id === usuario.id && (datos.activo === false || (datos.rol && datos.rol !== "admin"))) {
    throw new ApiError(
      422,
      "OPERACION_SOBRE_SI_MISMO",
      "No podés desactivarte ni quitarte el rol de administrador.",
    );
  }
  if (Object.keys(datos).length === 0) return obtener(id);

  try {
    await db.update(usuarios).set(datos).where(eq(usuarios.id, id));
  } catch (e) {
    if (esErrorUnico(e)) throw emailDuplicado();
    throw e;
  }
  return obtener(id);
}

/** RF-U5. El admin restablece la contraseña: se muestra una sola vez. */
export async function restablecerPassword(usuario: UsuarioSesion, id: number) {
  exigirRol(usuario, "admin");
  await obtener(id);
  const passwordTemporal = randomBytes(6).toString("base64url"); // 8 caracteres
  await db
    .update(usuarios)
    .set({ passwordHash: await hashPassword(passwordTemporal) })
    .where(eq(usuarios.id, id));
  return { passwordTemporal };
}
