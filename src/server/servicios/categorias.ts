/**
 * Categorías de productos (RF-P7).
 */
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { categoriaAltaSchema, categoriaEdicionSchema } from "@/lib/esquemas";
import { ApiError, errores } from "../errores";
import { esAdmin, exigirRol, type UsuarioSesion } from "../permisos";
import { esErrorUnico, validar } from "../validar";

const nombreDuplicado = () =>
  new ApiError(409, "NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.", [
    { campo: "nombre", mensaje: "Ya existe una categoría con ese nombre." },
  ]);

/**
 * RF-P7. Devuelve las categorías activas, sin paginar.
 * El admin puede pedir también las inactivas (para reactivarlas).
 */
export async function listarCategorias(usuario: UsuarioSesion, incluirInactivas = false) {
  const todas = incluirInactivas && esAdmin(usuario);
  const filas = await db
    .select({
      id: categorias.id,
      nombre: categorias.nombre,
      activa: categorias.activa,
      productos: count(productos.id),
    })
    .from(categorias)
    .leftJoin(productos, and(eq(productos.categoriaId, categorias.id), eq(productos.activo, true)))
    .where(todas ? undefined : eq(categorias.activa, true))
    .groupBy(categorias.id)
    .orderBy(categorias.nombre);
  return filas;
}

export async function crearCategoria(usuario: UsuarioSesion, entrada: unknown) {
  exigirRol(usuario, "admin");
  const datos = validar(categoriaAltaSchema, entrada);
  try {
    const [fila] = await db.insert(categorias).values({ nombre: datos.nombre }).returning();
    return { id: fila.id, nombre: fila.nombre, activa: fila.activa };
  } catch (e) {
    if (esErrorUnico(e)) throw nombreDuplicado();
    throw e;
  }
}

/** RF-P7. No se puede desactivar una categoría que tiene productos activos. */
export async function editarCategoria(usuario: UsuarioSesion, id: number, entrada: unknown) {
  exigirRol(usuario, "admin");
  const datos = validar(categoriaEdicionSchema, entrada);

  const [actual] = await db.select().from(categorias).where(eq(categorias.id, id));
  if (!actual) throw errores.noEncontrado("La categoría");

  if (datos.activa === false) {
    const [{ enUso }] = await db
      .select({ enUso: count() })
      .from(productos)
      .where(and(eq(productos.categoriaId, id), eq(productos.activo, true)));
    if (enUso > 0) {
      throw new ApiError(
        409,
        "CATEGORIA_EN_USO",
        `La categoría tiene ${enUso} producto(s) activo(s). Cambialos de categoría o dalos de baja primero.`,
      );
    }
  }

  try {
    const [fila] = await db.update(categorias).set(datos).where(eq(categorias.id, id)).returning();
    return { id: fila.id, nombre: fila.nombre, activa: fila.activa };
  } catch (e) {
    if (esErrorUnico(e)) throw nombreDuplicado();
    throw e;
  }
}
