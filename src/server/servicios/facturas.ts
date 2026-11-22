/**
 * Facturación (RF-V1 a RF-V9; reglas 1 a 7, 9 y 11).
 */
import { and, count, desc, eq, gte, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { contiene } from "../busqueda";
import { z } from "zod";
import { alias } from "drizzle-orm/sqlite-core";
import { db, type Ejecutor } from "@/db";
import {
  clientes,
  facturaItems,
  facturas,
  movimientosCuenta,
  productos,
  usuarios,
} from "@/db/schema";
import { COMERCIO } from "@/lib/comercio";
import { anulacionSchema, facturaSchema, fechaDiaSchema, paginacionSchema } from "@/lib/esquemas";
import { finDiaAR, inicioDiaAR } from "@/lib/fechas";
import { moneda, numeroFactura, soloDigitos } from "@/lib/formato";
import { ApiError, errores } from "../errores";
import { exigirRol, type UsuarioSesion } from "../permisos";
import { paginado, validar } from "../validar";
import { saldoCliente } from "./clientes";
import { moverStock } from "./stock";

/**
 * RF-V1 a RF-V6. Emite una factura.
 *
 * El cliente solo manda productos, cantidades y forma de pago: los precios,
 * subtotales y el total los calcula el servidor con el precio actual del
 * catálogo (regla 3). Todo pasa en UNA transacción: se graban factura,
 * renglones, stock y cuenta corriente, o no se graba nada.
 *
 * `fechaForzada` solo la usa el script de datos iniciales para repartir las
 * facturas de prueba en los últimos 30 días; la API nunca la recibe.
 */
export async function emitirFactura(
  usuario: UsuarioSesion,
  entrada: unknown,
  opciones: { fechaForzada?: string } = {},
) {
  const datos = validar(facturaSchema, entrada);
  const pv = COMERCIO.puntoVenta;

  const id = await db.transaction(async (tx) => {
    // 1. Los productos deben existir y estar activos.
    const ids = datos.items.map((i) => i.productoId);
    const catalogo = await tx.select().from(productos).where(inArray(productos.id, ids));
    const porId = new Map(catalogo.map((p) => [p.id, p]));
    for (const item of datos.items) {
      const p = porId.get(item.productoId);
      if (!p) throw errores.noEncontrado(`El producto ${item.productoId}`);
      if (!p.activo) {
        throw new ApiError(422, "PRODUCTO_INACTIVO", `"${p.descripcion}" está dado de baja.`, [
          { productoId: p.id },
        ]);
      }
    }

    // 2. Comprador: consumidor final (null) o cliente activo. Regla 6.
    let cliente: typeof clientes.$inferSelect | undefined;
    if (datos.clienteId !== null) {
      [cliente] = await tx.select().from(clientes).where(eq(clientes.id, datos.clienteId));
      if (!cliente) throw errores.noEncontrado("El cliente");
      if (!cliente.activo) {
        throw errores.validacion([{ campo: "clienteId", mensaje: "El cliente está dado de baja." }]);
      }
    }
    const aCuenta = datos.pago.forma === "cuenta_corriente";
    if (aCuenta && !cliente?.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        cliente
          ? "El cliente no tiene la cuenta corriente habilitada."
          : "El consumidor final no puede comprar en cuenta corriente.",
      );
    }

    // 3. Existencia suficiente para cada renglón (regla 1). Se informan todos los que fallan.
    const faltantes = datos.items
      .filter((i) => porId.get(i.productoId)!.existencia < i.cantidad)
      .map((i) => ({
        productoId: i.productoId,
        solicitado: i.cantidad,
        disponible: porId.get(i.productoId)!.existencia,
      }));
    if (faltantes.length > 0) {
      throw new ApiError(409, "STOCK_INSUFICIENTE", "No hay existencia suficiente.", faltantes);
    }

    // 4. Precio ACTUAL del catálogo, subtotales y total (todo en centavos).
    const renglones = datos.items.map((i) => {
      const p = porId.get(i.productoId)!;
      return {
        productoId: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: i.cantidad,
        precioUnitario: p.precio,
        subtotal: p.precio * i.cantidad,
      };
    });
    const total = renglones.reduce((s, r) => s + r.subtotal, 0);

    // 5. Controles de la forma de pago.
    let montoRecibido: number | null = null;
    if (datos.pago.forma === "contado") {
      montoRecibido = datos.pago.montoRecibido ?? total;
      if (montoRecibido < total) {
        throw new ApiError(422, "MONTO_INSUFICIENTE", "El monto recibido no cubre el total.", [
          { campo: "montoRecibido", mensaje: `Debe ser al menos ${moneda(total)}.` },
        ]);
      }
    }
    if (aCuenta && cliente!.limiteCredito !== null) {
      // Regla 7: la venta no puede dejar el saldo por encima del límite.
      const saldoActual = await saldoCliente(tx, cliente!.id);
      if (saldoActual + total > cliente!.limiteCredito) {
        throw new ApiError(
          422,
          "LIMITE_CREDITO_EXCEDIDO",
          "La venta supera el límite de crédito del cliente.",
          {
            saldoActual,
            limite: cliente!.limiteCredito,
            excedente: saldoActual + total - cliente!.limiteCredito,
          },
        );
      }
    }

    // 6. Número correlativo, asignado recién al confirmar (regla 4).
    const numero = await proximoNumero(tx, pv);

    // 7. Factura y renglones (con descripción y precio copiados del catálogo).
    const tarjeta = datos.pago.forma === "tarjeta" ? datos.pago.tarjeta : null;
    const [factura] = await tx
      .insert(facturas)
      .values({
        puntoVenta: pv,
        numero,
        clienteId: cliente?.id ?? null,
        usuarioId: usuario.id,
        total,
        formaPago: datos.pago.forma,
        tarjetaTipo: tarjeta?.tipo ?? null,
        tarjetaMarca: tarjeta?.marca ?? null,
        tarjetaUltimos4: tarjeta?.ultimos4 ?? null, // regla 9: nunca el número completo
        montoRecibido,
        ...(opciones.fechaForzada && { fecha: opciones.fechaForzada }),
      })
      .returning({ id: facturas.id });

    await tx.insert(facturaItems).values(renglones.map((r) => ({ ...r, facturaId: factura.id })));

    // 8. Descuento de stock con su movimiento, renglón por renglón (regla 2).
    //    moverStock vuelve a controlar la existencia con un UPDATE condicional:
    //    si otra venta se llevó la última unidad, falla y se deshace todo.
    const nro = numeroFactura(pv, numero);
    for (const r of renglones) {
      await moverStock(tx, {
        productoId: r.productoId,
        usuarioId: usuario.id,
        tipo: "venta",
        cantidad: -r.cantidad,
        motivo: `Venta ${nro}`,
        facturaId: factura.id,
      });
    }

    // 9. Débito en la cuenta corriente.
    if (aCuenta) {
      await tx.insert(movimientosCuenta).values({
        clienteId: cliente!.id,
        tipo: "debito",
        importe: total,
        descripcion: `Factura ${nro}`,
        facturaId: factura.id,
        ...(opciones.fechaForzada && { fecha: opciones.fechaForzada }),
      });
    }

    return factura.id;
  });

  return obtenerFactura(usuario, id);
}

/** Último número del punto de venta + 1, leído dentro de la transacción de escritura. */
async function proximoNumero(tx: Ejecutor, puntoVenta: number): Promise<number> {
  const [fila] = await tx
    .select({ ultimo: sql<number>`coalesce(max(${facturas.numero}), 0)` })
    .from(facturas)
    .where(eq(facturas.puntoVenta, puntoVenta));
  return Number(fila.ultimo) + 1;
}

/** GET /api/facturas/proximo-numero. Solo informativo: el real se asigna al confirmar. */
export async function proximoNumeroInformativo(_usuario: UsuarioSesion) {
  const numero = await proximoNumero(db, COMERCIO.puntoVenta);
  return { numeroFormateado: numeroFactura(COMERCIO.puntoVenta, numero) };
}

/**
 * RF-V9. Anulación (solo administrador, con motivo). Regla 5: la factura no
 * se borra ni se modifica; se marca anulada, se reingresa el stock y, si fue
 * a cuenta corriente, se registra un crédito. Todo en una transacción.
 */
export async function anularFactura(usuario: UsuarioSesion, id: number, entrada: unknown) {
  exigirRol(usuario, "admin");
  const { motivo } = validar(anulacionSchema, entrada);

  await db.transaction(async (tx) => {
    const [factura] = await tx.select().from(facturas).where(eq(facturas.id, id));
    if (!factura) throw errores.noEncontrado("La factura");

    // UPDATE condicional: si ya estaba anulada (o la anularon recién), no cambia nada.
    const [marcada] = await tx
      .update(facturas)
      .set({
        estado: "anulada",
        motivoAnulacion: motivo,
        anuladaEn: new Date().toISOString(),
        anuladaPorId: usuario.id,
      })
      .where(and(eq(facturas.id, id), eq(facturas.estado, "emitida")))
      .returning({ id: facturas.id });
    if (!marcada) throw new ApiError(409, "FACTURA_ANULADA", "La factura ya estaba anulada.");

    const nro = numeroFactura(factura.puntoVenta, factura.numero);
    const items = await tx.select().from(facturaItems).where(eq(facturaItems.facturaId, id));
    for (const item of items) {
      await moverStock(tx, {
        productoId: item.productoId,
        usuarioId: usuario.id,
        tipo: "anulacion",
        cantidad: item.cantidad, // vuelve a entrar
        motivo: `Anulación ${nro}`,
        facturaId: id,
      });
    }

    if (factura.formaPago === "cuenta_corriente" && factura.clienteId !== null) {
      await tx.insert(movimientosCuenta).values({
        clienteId: factura.clienteId,
        tipo: "credito",
        importe: factura.total,
        descripcion: `Anulación factura ${nro}`,
        facturaId: id,
      });
    }
  });

  return obtenerFactura(usuario, id);
}

// ---------------------------------------------------------------- consultas

/** RF-V7. La factura completa, con la forma de la respuesta de emisión. */
export async function obtenerFactura(_usuario: UsuarioSesion | null, id: number) {
  // La tabla usuarios aparece dos veces: como vendedor y como quien anuló.
  const anulador = alias(usuarios, "anulador");
  const [f] = await db
    .select({
      factura: facturas,
      cliente: {
        id: clientes.id,
        nombre: clientes.nombre,
        tipoDoc: clientes.tipoDoc,
        nroDoc: clientes.nroDoc,
        domicilio: clientes.domicilio,
      },
      vendedor: { id: usuarios.id, nombre: usuarios.nombre },
      anuladaPorNombre: anulador.nombre,
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, facturas.usuarioId))
    .leftJoin(anulador, eq(anulador.id, facturas.anuladaPorId))
    .where(eq(facturas.id, id));
  if (!f) throw errores.noEncontrado("La factura");

  const items = await db
    .select()
    .from(facturaItems)
    .where(eq(facturaItems.facturaId, id))
    .orderBy(facturaItems.id);

  const fa = f.factura;
  const pago =
    fa.formaPago === "contado"
      ? {
          forma: "contado" as const,
          montoRecibido: fa.montoRecibido ?? fa.total,
          vuelto: (fa.montoRecibido ?? fa.total) - fa.total,
        }
      : fa.formaPago === "tarjeta"
        ? {
            forma: "tarjeta" as const,
            tarjeta: { tipo: fa.tarjetaTipo, marca: fa.tarjetaMarca, ultimos4: fa.tarjetaUltimos4 },
          }
        : { forma: "cuenta_corriente" as const };

  return {
    id: fa.id,
    puntoVenta: fa.puntoVenta,
    numero: fa.numero,
    numeroFormateado: numeroFactura(fa.puntoVenta, fa.numero),
    fecha: fa.fecha,
    estado: fa.estado,
    cliente: f.cliente?.id ? f.cliente : null,
    vendedor: f.vendedor,
    items: items.map((i) => ({
      productoId: i.productoId,
      codigo: i.codigo,
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.subtotal,
    })),
    total: fa.total,
    pago,
    ...(fa.formaPago === "cuenta_corriente" &&
      fa.clienteId !== null && { saldoCliente: await saldoCliente(db, fa.clienteId) }),
    ...(fa.estado === "anulada" && {
      anulacion: {
        fecha: fa.anuladaEn,
        usuario: { id: fa.anuladaPorId, nombre: f.anuladaPorNombre },
        motivo: fa.motivoAnulacion,
      },
    }),
  };
}

export type FacturaPublica = Awaited<ReturnType<typeof obtenerFactura>>;

const filtrosSchema = paginacionSchema.extend({
  q: z.string().trim().optional(),
  desde: fechaDiaSchema.optional(),
  hasta: fechaDiaSchema.optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  forma: z.enum(["contado", "tarjeta", "cuenta_corriente"]).optional(),
  estado: z.enum(["emitida", "anulada"]).optional(),
});

/**
 * RF-V8. Listado con filtros por fecha, cliente, forma de pago y vendedor;
 * búsqueda por número o nombre del cliente; paginado. Agrega `totalEmitido`.
 */
export async function listarFacturas(_usuario: UsuarioSesion, query: unknown) {
  const f = validar(filtrosSchema, query);

  const c: SQL[] = [];
  if (f.q) {
    // "0001-00001233", "1233" o un nombre: se busca por número y por cliente.
    const digitos = soloDigitos(f.q.split("-").pop() ?? "");
    const porNombre = contiene(clientes.nombre, f.q);
    c.push(digitos ? or(porNombre, eq(facturas.numero, Number(digitos)))! : porNombre);
  }
  if (f.desde) c.push(gte(facturas.fecha, inicioDiaAR(f.desde)));
  if (f.hasta) c.push(lt(facturas.fecha, finDiaAR(f.hasta)));
  if (f.clienteId) c.push(eq(facturas.clienteId, f.clienteId));
  if (f.vendedorId) c.push(eq(facturas.usuarioId, f.vendedorId));
  if (f.forma) c.push(eq(facturas.formaPago, f.forma));
  if (f.estado) c.push(eq(facturas.estado, f.estado));
  const where = c.length ? and(...c) : undefined;

  const base = () =>
    db.select({ total: count() }).from(facturas).leftJoin(clientes, eq(clientes.id, facturas.clienteId));
  const [{ total }] = await base().where(where);

  const filas = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      total: facturas.total,
      formaPago: facturas.formaPago,
      estado: facturas.estado,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      vendedorId: usuarios.id,
      vendedorNombre: usuarios.nombre,
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, facturas.usuarioId))
    .where(where)
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  const [{ totalEmitido }] = await db
    .select({ totalEmitido: sql<number>`coalesce(sum(${facturas.total}), 0)` })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .where(and(where, eq(facturas.estado, "emitida")));

  return {
    ...paginado(
      filas.map((r) => ({
        id: r.id,
        numeroFormateado: numeroFactura(r.puntoVenta, r.numero),
        fecha: r.fecha,
        cliente: r.clienteId ? { id: r.clienteId, nombre: r.clienteNombre! } : null,
        vendedor: { id: r.vendedorId, nombre: r.vendedorNombre },
        total: r.total,
        formaPago: r.formaPago,
        estado: r.estado,
      })),
      total,
      f.page,
      f.pageSize,
    ),
    totalEmitido: Number(totalEmitido),
  };
}

/** Vendedores para el filtro del listado de facturas. */
export async function listarVendedores() {
  return db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).orderBy(usuarios.nombre);
}
