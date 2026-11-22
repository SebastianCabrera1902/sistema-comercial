/**
 * Clientes y cuenta corriente (RF-C1, RF-C2, RF-C3, RF-C4, RF-C6, RF-C7).
 *
 * El saldo NO se guarda en el cliente: se calcula siempre como
 * débitos − créditos de `movimientos_cuenta` (regla 7). Una sola fuente de verdad.
 */
import { and, asc, count, desc, eq, gte, like, lt, or, sql, type SQL } from "drizzle-orm";
import { contiene } from "../busqueda";
import { z } from "zod";
import { db, type Ejecutor } from "@/db";
import { clientes, facturas, movimientosCuenta } from "@/db/schema";
import {
  clienteAltaSchema,
  clienteEdicionSchema,
  fechaDiaSchema,
  paginacionSchema,
} from "@/lib/esquemas";
import { finDiaAR, inicioDiaAR } from "@/lib/fechas";
import { documento, numeroFactura, soloDigitos } from "@/lib/formato";
import { ApiError, errores } from "../errores";
import type { UsuarioSesion } from "../permisos";
import { esErrorUnico, paginado, validar } from "../validar";

/**
 * Expresión SQL del saldo de cada cliente: suma de débitos menos suma de créditos.
 * Es una subconsulta "correlacionada": se calcula una vez por cada fila de clientes.
 * Las columnas se escriben con su tabla (mc. y "clientes".) a propósito: si no,
 * dentro de la subconsulta "id" se confundiría con el id del movimiento.
 */
const saldoSql = sql<number>`coalesce((
  select sum(case when mc.tipo = 'debito' then mc.importe else -mc.importe end)
  from movimientos_cuenta mc
  where mc.cliente_id = "clientes"."id"
), 0)`;

/** Regla 7. Saldo actual de un cliente (dentro de la transacción si se pasa `tx`). */
export async function saldoCliente(tx: Ejecutor, clienteId: number): Promise<number> {
  const [fila] = await tx
    .select({
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito'
        then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId));
  return Number(fila?.saldo ?? 0);
}

const seleccion = {
  id: clientes.id,
  tipoDoc: clientes.tipoDoc,
  nroDoc: clientes.nroDoc,
  nombre: clientes.nombre,
  domicilio: clientes.domicilio,
  telefono: clientes.telefono,
  email: clientes.email,
  cuentaCorriente: clientes.cuentaCorriente,
  limiteCredito: clientes.limiteCredito,
  activo: clientes.activo,
  saldo: saldoSql,
};

type Fila = {
  id: number;
  tipoDoc: "DNI" | "CUIT";
  nroDoc: string;
  nombre: string;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
  activo: boolean;
  saldo: number;
};

/** Forma pública de un cliente (sección 11.5). */
function aPublico(f: Fila) {
  const saldo = Number(f.saldo);
  return {
    id: f.id,
    tipoDoc: f.tipoDoc,
    nroDoc: f.nroDoc,
    nombre: f.nombre,
    domicilio: f.domicilio,
    telefono: f.telefono,
    email: f.email,
    cuentaCorriente: f.cuentaCorriente,
    limiteCredito: f.limiteCredito,
    saldo,
    disponible: f.limiteCredito === null ? null : f.limiteCredito - saldo,
    activo: f.activo,
  };
}

export type ClientePublico = ReturnType<typeof aPublico>;

const filtrosSchema = paginacionSchema.extend({
  q: z.string().trim().optional(),
  conDeuda: z.enum(["true", "false"]).optional(),
  orden: z.enum(["saldo", "nombre"]).optional(),
  activo: z.enum(["true", "false", "todos"]).optional(),
});

/**
 * RF-C1 y RF-C6. Listado con búsqueda por nombre o documento (sin importar
 * puntos ni guiones) y el saldo de cada uno. Con conDeuda=true agrega el
 * total adeudado.
 */
export async function listarClientes(_usuario: UsuarioSesion, query: unknown) {
  const f = validar(filtrosSchema, query);

  const c: SQL[] = [];
  if (f.q) {
    const digitos = soloDigitos(f.q);
    const porNombre = contiene(clientes.nombre, f.q);
    c.push(digitos ? or(porNombre, like(clientes.nroDocNormalizado, `%${digitos}%`))! : porNombre);
  }
  const activo = f.activo ?? "true";
  if (activo !== "todos") c.push(eq(clientes.activo, activo === "true"));
  if (f.conDeuda === "true") c.push(sql`${saldoSql} > 0`);
  const where = c.length ? and(...c) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(clientes).where(where);
  const filas = await db
    .select(seleccion)
    .from(clientes)
    .where(where)
    .orderBy(f.orden === "saldo" ? desc(saldoSql) : asc(clientes.nombre), asc(clientes.id))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  const respuesta = paginado(filas.map(aPublico), total, f.page, f.pageSize);
  if (f.conDeuda !== "true") return respuesta;

  const [{ totalAdeudado }] = await db
    .select({ totalAdeudado: sql<number>`coalesce(sum(${saldoSql}), 0)` })
    .from(clientes)
    .where(where);
  return { ...respuesta, totalAdeudado: Number(totalAdeudado) };
}

async function filaCliente(tx: Ejecutor, id: number) {
  const [fila] = await tx.select(seleccion).from(clientes).where(eq(clientes.id, id));
  if (!fila) throw errores.noEncontrado("El cliente");
  return aPublico(fila);
}

/** RF-C3. Ficha del cliente con sus 6 últimas facturas. */
export async function obtenerCliente(_usuario: UsuarioSesion | null, id: number) {
  const cliente = await filaCliente(db, id);
  const ultimas = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      total: facturas.total,
      formaPago: facturas.formaPago,
      estado: facturas.estado,
    })
    .from(facturas)
    .where(eq(facturas.clienteId, id))
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(6);

  return {
    ...cliente,
    ultimasFacturas: ultimas.map((f) => ({
      id: f.id,
      numeroFormateado: numeroFactura(f.puntoVenta, f.numero),
      fecha: f.fecha,
      total: f.total,
      formaPago: f.formaPago,
      estado: f.estado,
    })),
  };
}

export { filaCliente as obtenerClienteBasico };

const documentoDuplicado = () =>
  new ApiError(409, "DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.", [
    { campo: "nroDoc", mensaje: "Ya existe un cliente con ese documento." },
  ]);

/** RF-C2 (y RF-V2: el alta rápida desde Nueva venta usa esta misma función). */
export async function crearCliente(_usuario: UsuarioSesion, entrada: unknown) {
  const datos = validar(clienteAltaSchema, entrada);
  const digitos = soloDigitos(datos.nroDoc);
  try {
    const [nuevo] = await db
      .insert(clientes)
      .values({
        ...datos,
        nroDoc: documento(datos.tipoDoc, digitos),
        nroDocNormalizado: digitos,
        cuentaCorriente: datos.cuentaCorriente ?? false,
        // El límite solo tiene sentido con cuenta corriente.
        limiteCredito: datos.cuentaCorriente ? (datos.limiteCredito ?? null) : null,
      })
      .returning({ id: clientes.id });
    return filaCliente(db, nuevo.id);
  } catch (e) {
    if (esErrorUnico(e)) throw documentoDuplicado();
    throw e;
  }
}

/**
 * RF-C2 y RF-C7. Edición y baja lógica. No se puede desactivar ni quitar la
 * cuenta corriente a un cliente que tiene saldo distinto de cero.
 */
export async function editarCliente(usuario: UsuarioSesion, id: number, entrada: unknown) {
  const datos = validar(clienteEdicionSchema, entrada);
  const actual = await filaCliente(db, id);

  const quitaCuenta = datos.cuentaCorriente === false && actual.cuentaCorriente;
  if ((datos.activo === false || quitaCuenta) && actual.saldo !== 0) {
    throw new ApiError(
      422,
      "SALDO_PENDIENTE",
      "El cliente tiene saldo pendiente: no se puede dar de baja ni quitarle la cuenta corriente.",
    );
  }

  const cambios: Partial<typeof clientes.$inferInsert> = { ...datos };
  if (datos.nroDoc !== undefined || datos.tipoDoc !== undefined) {
    const tipo = datos.tipoDoc ?? actual.tipoDoc;
    const digitos = soloDigitos(datos.nroDoc ?? actual.nroDoc);
    cambios.nroDoc = documento(tipo, digitos);
    cambios.nroDocNormalizado = digitos;
  }
  if (datos.cuentaCorriente === false) cambios.limiteCredito = null;

  if (Object.keys(cambios).length > 0) {
    try {
      await db.update(clientes).set(cambios).where(eq(clientes.id, id));
    } catch (e) {
      if (esErrorUnico(e)) throw documentoDuplicado();
      throw e;
    }
  }
  return obtenerCliente(usuario, id);
}

const cuentaSchema = z.object({
  desde: fechaDiaSchema.optional(),
  hasta: fechaDiaSchema.optional(),
});

/**
 * RF-C4. Movimientos en orden cronológico con el saldo acumulado en cada
 * renglón. Si `desde` corta el historial, `saldoAnterior` trae lo acumulado.
 */
export async function cuentaCorriente(_usuario: UsuarioSesion, id: number, query: unknown) {
  const f = validar(cuentaSchema, query);
  const cliente = await filaCliente(db, id);

  const importeConSigno = sql<number>`case when ${movimientosCuenta.tipo} = 'debito'
    then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end`;

  let saldoAnterior = 0;
  if (f.desde) {
    const [fila] = await db
      .select({ s: sql<number>`coalesce(sum(${importeConSigno}), 0)` })
      .from(movimientosCuenta)
      .where(
        and(eq(movimientosCuenta.clienteId, id), lt(movimientosCuenta.fecha, inicioDiaAR(f.desde))),
      );
    saldoAnterior = Number(fila.s);
  }

  const c: SQL[] = [eq(movimientosCuenta.clienteId, id)];
  if (f.desde) c.push(gte(movimientosCuenta.fecha, inicioDiaAR(f.desde)));
  if (f.hasta) c.push(lt(movimientosCuenta.fecha, finDiaAR(f.hasta)));

  const filas = await db
    .select()
    .from(movimientosCuenta)
    .where(and(...c))
    .orderBy(asc(movimientosCuenta.fecha), asc(movimientosCuenta.id));

  let acumulado = saldoAnterior;
  const movimientos = filas.map((m) => {
    acumulado += m.tipo === "debito" ? m.importe : -m.importe;
    return {
      fecha: m.fecha,
      tipo: m.tipo,
      importe: m.importe,
      descripcion: m.descripcion,
      facturaId: m.facturaId,
      pagoId: m.pagoId,
      saldo: acumulado,
    };
  });

  return {
    cliente: { id: cliente.id, nombre: cliente.nombre },
    saldoAnterior,
    movimientos,
    saldo: acumulado,
  };
}
