/**
 * Catálogo de productos (RF-P1, RF-P2, RF-P3).
 */
import { and, count, eq, lt, or, type SQL } from "drizzle-orm";
import { contiene } from "../busqueda";
import { z } from "zod";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { paginacionSchema, productoAltaSchema, productoEdicionSchema } from "@/lib/esquemas";
import { ApiError, errores } from "../errores";
import { esAdmin, exigirRol, type UsuarioSesion } from "../permisos";
import { esErrorUnico, paginado, validar } from "../validar";
import { moverStock } from "./stock";

const seleccion = {
  id: productos.id,
  codigo: productos.codigo,
  descripcion: productos.descripcion,
  categoriaId: categorias.id,
  categoriaNombre: categorias.nombre,
  precio: productos.precio,
  existencia: productos.existencia,
  stockMinimo: productos.stockMinimo,
  activo: productos.activo,
};

type Fila = {
  id: number;
  codigo: string;
  descripcion: string;
  categoriaId: number;
  categoriaNombre: string;
  precio: number;
  existencia: number;
  stockMinimo: number;
  activo: boolean;
};

/** Forma pública de un producto (sección 11.4). */
function aPublico(f: Fila) {
  return {
    id: f.id,
    codigo: f.codigo,
    descripcion: f.descripcion,
    categoria: { id: f.categoriaId, nombre: f.categoriaNombre },
    precio: f.precio,
    existencia: f.existencia,
    stockMinimo: f.stockMinimo,
    bajoMinimo: f.existencia < f.stockMinimo,
    activo: f.activo,
  };
}

export type ProductoPublico = ReturnType<typeof aPublico>;

const filtrosSchema = paginacionSchema.extend({
  q: z.string().trim().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  bajoMinimo: z.enum(["true", "false"]).optional(),
  activo: z.enum(["true", "false", "todos"]).optional(),
});

/** RF-P1. Listado paginado con búsqueda por código o descripción. */
export async function listarProductos(usuario: UsuarioSesion, query: unknown) {
  const f = validar(filtrosSchema, query);

  const c: SQL[] = [];
  if (f.q) {
    c.push(or(contiene(productos.codigo, f.q), contiene(productos.descripcion, f.q))!);
  }
  if (f.categoriaId) c.push(eq(productos.categoriaId, f.categoriaId));
  if (f.bajoMinimo === "true") c.push(lt(productos.existencia, productos.stockMinimo));

  // Por defecto solo activos; ver inactivos es cosa del administrador.
  const activo = esAdmin(usuario) ? (f.activo ?? "true") : "true";
  if (activo !== "todos") c.push(eq(productos.activo, activo === "true"));

  const where = c.length ? and(...c) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(productos).where(where);
  const filas = await db
    .select(seleccion)
    .from(productos)
    .innerJoin(categorias, eq(categorias.id, productos.categoriaId))
    .where(where)
    .orderBy(productos.descripcion)
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  return paginado(filas.map(aPublico), total, f.page, f.pageSize);
}

export async function obtenerProducto(_usuario: UsuarioSesion | null, id: number) {
  const [fila] = await db
    .select(seleccion)
    .from(productos)
    .innerJoin(categorias, eq(categorias.id, productos.categoriaId))
    .where(eq(productos.id, id));
  if (!fila) throw errores.noEncontrado("El producto");
  return aPublico(fila);
}

const codigoDuplicado = () =>
  new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.", [
    { campo: "codigo", mensaje: "Ya existe un producto con ese código." },
  ]);

async function verificarCategoria(categoriaId: number) {
  const [cat] = await db.select().from(categorias).where(eq(categorias.id, categoriaId));
  if (!cat || !cat.activa) {
    throw new ApiError(422, "VALIDACION", "La categoría no existe o está inactiva.", [
      { campo: "categoriaId", mensaje: "La categoría no existe o está inactiva." },
    ]);
  }
}

/**
 * RF-P2. Alta de producto. La existencia empieza en 0; si viene stockInicial,
 * se registra como un movimiento de ingreso "Stock inicial" en la MISMA
 * transacción, así la suma de movimientos siempre da la existencia.
 */
export async function crearProducto(usuario: UsuarioSesion, entrada: unknown) {
  exigirRol(usuario, "admin");
  const { stockInicial, ...datos } = validar(productoAltaSchema, entrada);
  await verificarCategoria(datos.categoriaId);

  try {
    const id = await db.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(productos)
        .values({ ...datos, existencia: 0 })
        .returning({ id: productos.id });
      if (stockInicial && stockInicial > 0) {
        await moverStock(tx, {
          productoId: nuevo.id,
          usuarioId: usuario.id,
          tipo: "ingreso",
          cantidad: stockInicial,
          motivo: "Stock inicial",
        });
      }
      return nuevo.id;
    });
    return obtenerProducto(usuario, id);
  } catch (e) {
    if (esErrorUnico(e)) throw codigoDuplicado();
    throw e;
  }
}

/**
 * RF-P2 y RF-P3. Edición y baja lógica (`activo: false`). La existencia no
 * se acepta: el esquema estricto la rechaza con 422.
 */
export async function editarProducto(usuario: UsuarioSesion, id: number, entrada: unknown) {
  exigirRol(usuario, "admin");
  const datos = validar(productoEdicionSchema, entrada);
  await obtenerProducto(usuario, id);
  if (datos.categoriaId) await verificarCategoria(datos.categoriaId);

  if (Object.keys(datos).length > 0) {
    try {
      await db.update(productos).set(datos).where(eq(productos.id, id));
    } catch (e) {
      if (esErrorUnico(e)) throw codigoDuplicado();
      throw e;
    }
  }
  return obtenerProducto(usuario, id);
}
