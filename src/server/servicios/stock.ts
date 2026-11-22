/**
 * Existencias y movimientos de stock (RF-P4, RF-P5, RF-P6; reglas 1 y 2).
 *
 * INVARIANTE: la existencia de un producto SOLO cambia en moverStock().
 * Ventas, anulaciones, ingresos y egresos la llaman; ninguna otra función
 * modifica `productos.existencia` por su cuenta.
 */
import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, type Ejecutor } from "@/db";
import { facturas, movimientosStock, productos, usuarios } from "@/db/schema";
import { fechaDiaSchema, movimientoManualSchema, paginacionSchema } from "@/lib/esquemas";
import { finDiaAR, inicioDiaAR } from "@/lib/fechas";
import { numeroFactura } from "@/lib/formato";
import { ApiError, errores } from "../errores";
import { exigirRol, type UsuarioSesion } from "../permisos";
import { paginado, validar } from "../validar";

type Movimiento = {
  productoId: number;
  usuarioId: number;
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  /** Con signo: positivo entra, negativo sale. */
  cantidad: number;
  motivo: string;
  observacion?: string | null;
  facturaId?: number | null;
};

/**
 * Regla 1 y 2. Cambia la existencia y graba el movimiento EN LA MISMA
 * transacción (`tx`).
 *
 * Para que dos ventas simultáneas de la última unidad no dejen el stock
 * negativo, el descuento es un UPDATE con condición:
 *   UPDATE productos SET existencia = existencia + ?
 *   WHERE id = ? AND existencia >= ?
 * Si no modificó ninguna fila es porque no alcanza: se lanza
 * STOCK_INSUFICIENTE y la transacción entera se deshace.
 */
export async function moverStock(tx: Ejecutor, m: Movimiento) {
  const condicion =
    m.cantidad < 0
      ? and(eq(productos.id, m.productoId), gte(productos.existencia, -m.cantidad))
      : eq(productos.id, m.productoId);

  const [actualizado] = await tx
    .update(productos)
    .set({ existencia: sql`${productos.existencia} + ${m.cantidad}` })
    .where(condicion)
    .returning({ existencia: productos.existencia });

  if (!actualizado) {
    const [p] = await tx
      .select({ existencia: productos.existencia, descripcion: productos.descripcion })
      .from(productos)
      .where(eq(productos.id, m.productoId));
    if (!p) throw errores.noEncontrado("El producto");
    throw new ApiError(
      409,
      "STOCK_INSUFICIENTE",
      `No hay existencia suficiente de "${p.descripcion}".`,
      [{ productoId: m.productoId, solicitado: -m.cantidad, disponible: p.existencia }],
    );
  }

  const [movimiento] = await tx
    .insert(movimientosStock)
    .values({
      productoId: m.productoId,
      usuarioId: m.usuarioId,
      tipo: m.tipo,
      cantidad: m.cantidad,
      existenciaResultante: actualizado.existencia,
      motivo: m.motivo,
      observacion: m.observacion ?? null,
      facturaId: m.facturaId ?? null,
    })
    .returning({ id: movimientosStock.id });

  return { id: movimiento.id, existenciaResultante: actualizado.existencia };
}

/** RF-P4 / RF-P5. Ingreso o egreso manual (solo administrador). */
export async function registrarMovimientoManual(
  usuario: UsuarioSesion,
  productoId: number,
  entrada: unknown,
) {
  exigirRol(usuario, "admin");
  const datos = validar(movimientoManualSchema, entrada);

  const [producto] = await db.select().from(productos).where(eq(productos.id, productoId));
  if (!producto) throw errores.noEncontrado("El producto");

  // El signo lo pone el servidor: el egreso resta.
  const cantidad = datos.tipo === "ingreso" ? datos.cantidad : -datos.cantidad;

  const { id } = await db.transaction((tx) =>
    moverStock(tx, {
      productoId,
      usuarioId: usuario.id,
      tipo: datos.tipo,
      cantidad,
      motivo: datos.motivo,
      observacion: datos.observacion,
    }),
  );
  return obtenerMovimiento(id);
}

// ---------------------------------------------------------------- consultas

const seleccionMovimiento = {
  id: movimientosStock.id,
  productoId: productos.id,
  codigo: productos.codigo,
  descripcion: productos.descripcion,
  tipo: movimientosStock.tipo,
  cantidad: movimientosStock.cantidad,
  existenciaResultante: movimientosStock.existenciaResultante,
  motivo: movimientosStock.motivo,
  observacion: movimientosStock.observacion,
  usuarioId: usuarios.id,
  usuarioNombre: usuarios.nombre,
  facturaId: facturas.id,
  puntoVenta: facturas.puntoVenta,
  numero: facturas.numero,
  fecha: movimientosStock.fecha,
};

type FilaMovimiento = {
  id: number;
  productoId: number;
  codigo: string;
  descripcion: string;
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  cantidad: number;
  existenciaResultante: number;
  motivo: string;
  observacion: string | null;
  usuarioId: number;
  usuarioNombre: string;
  facturaId: number | null;
  puntoVenta: number | null;
  numero: number | null;
  fecha: string;
};

/** Forma pública de un movimiento (sección 11.4). */
function aPublico(f: FilaMovimiento) {
  return {
    id: f.id,
    producto: { id: f.productoId, codigo: f.codigo, descripcion: f.descripcion },
    tipo: f.tipo,
    cantidad: f.cantidad,
    existenciaResultante: f.existenciaResultante,
    motivo: f.motivo,
    observacion: f.observacion,
    referencia:
      f.facturaId !== null
        ? { facturaId: f.facturaId, numero: numeroFactura(f.puntoVenta!, f.numero!) }
        : null,
    usuario: { id: f.usuarioId, nombre: f.usuarioNombre },
    fecha: f.fecha,
  };
}

export type MovimientoStockPublico = ReturnType<typeof aPublico>;

function consultaBase() {
  return db
    .select(seleccionMovimiento)
    .from(movimientosStock)
    .innerJoin(productos, eq(productos.id, movimientosStock.productoId))
    .innerJoin(usuarios, eq(usuarios.id, movimientosStock.usuarioId))
    .leftJoin(facturas, eq(facturas.id, movimientosStock.facturaId));
}

async function obtenerMovimiento(id: number) {
  const [fila] = await consultaBase().where(eq(movimientosStock.id, id));
  return aPublico(fila);
}

const filtrosSchema = paginacionSchema.extend({
  productoId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["venta", "anulacion", "ingreso", "egreso"]).optional(),
  desde: fechaDiaSchema.optional(),
  hasta: fechaDiaSchema.optional(),
});

/** RF-P6. Historial de movimientos, del más nuevo al más viejo. */
export async function listarMovimientos(_usuario: UsuarioSesion, query: unknown) {
  const f = validar(filtrosSchema, query);

  const c: SQL[] = [];
  if (f.productoId) c.push(eq(movimientosStock.productoId, f.productoId));
  if (f.tipo) c.push(eq(movimientosStock.tipo, f.tipo));
  if (f.desde) c.push(gte(movimientosStock.fecha, inicioDiaAR(f.desde)));
  if (f.hasta) c.push(lt(movimientosStock.fecha, finDiaAR(f.hasta)));
  const where = c.length ? and(...c) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(movimientosStock).where(where);
  const filas = await consultaBase()
    .where(where)
    .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  return paginado(filas.map(aPublico), total, f.page, f.pageSize);
}
