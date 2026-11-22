/**
 * Tablero de inicio (RF-T1, RF-T2, RF-T3). Solo cuenta facturas emitidas
 * (las anuladas no suman); el día y el mes se calculan en hora de Argentina.
 */
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { facturaItems, facturas, productos } from "@/db/schema";
import { finDiaAR, hoyAR, inicioDiaAR, inicioMes, sumarDias } from "@/lib/fechas";
import type { UsuarioSesion } from "../permisos";

/** Día de Argentina de una fecha guardada en UTC (Argentina = UTC−3). */
const diaAR = sql<string>`date(datetime(${facturas.fecha}, '-3 hours'))`;

export async function obtenerTablero(_usuario: UsuarioSesion) {
  const hoy = hoyAR();
  const desdeMes = inicioDiaAR(inicioMes(hoy));
  const hasta = finDiaAR(hoy);
  const desde30 = inicioDiaAR(sumarDias(hoy, -29));
  const emitida = eq(facturas.estado, "emitida");

  const resumen = async (desde: string) => {
    const [r] = await db
      .select({ cantidad: count(), importe: sql<number>`coalesce(sum(${facturas.total}), 0)` })
      .from(facturas)
      .where(and(emitida, gte(facturas.fecha, desde), lt(facturas.fecha, hasta)));
    return { cantidad: r.cantidad, importe: Number(r.importe) };
  };

  // RF-T1. Indicadores.
  const [delDia, delMes] = await Promise.all([resumen(inicioDiaAR(hoy)), resumen(desdeMes)]);

  // Saldo de cada cliente = débitos − créditos; se suman solo los que deben.
  const [cuentas] = await db.all<{ totalAdeudado: number | null; clientesConSaldo: number }>(sql`
    select sum(saldo) as totalAdeudado, count(*) as clientesConSaldo from (
      select sum(case when tipo = 'debito' then importe else -importe end) as saldo
      from movimientos_cuenta group by cliente_id
    ) where saldo > 0`);

  const [bajo] = await db
    .select({ cantidad: count() })
    .from(productos)
    .where(and(eq(productos.activo, true), lt(productos.existencia, productos.stockMinimo)));

  // RF-T2. Ventas diarias de los últimos 30 días: siempre 30 puntos, con 0 los días sin ventas.
  const porDia = await db
    .select({ dia: diaAR, importe: sql<number>`sum(${facturas.total})` })
    .from(facturas)
    .where(and(emitida, gte(facturas.fecha, desde30), lt(facturas.fecha, hasta)))
    .groupBy(diaAR);
  const mapaDias = new Map(porDia.map((d) => [d.dia, Number(d.importe)]));
  const ventasDiarias = Array.from({ length: 30 }, (_, i) => {
    const fecha = sumarDias(hoy, i - 29);
    return { fecha, importe: mapaDias.get(fecha) ?? 0 };
  });

  // RF-T2. Ventas del mes por forma de pago (las tres, aunque alguna sea 0).
  const porForma = await db
    .select({ forma: facturas.formaPago, importe: sql<number>`sum(${facturas.total})` })
    .from(facturas)
    .where(and(emitida, gte(facturas.fecha, desdeMes), lt(facturas.fecha, hasta)))
    .groupBy(facturas.formaPago);
  const porFormaDePago = (["contado", "tarjeta", "cuenta_corriente"] as const).map((forma) => ({
    forma,
    importe: Number(porForma.find((f) => f.forma === forma)?.importe ?? 0),
  }));

  // RF-T3. Los 5 productos más vendidos del mes, por unidades.
  const unidades = sql<number>`sum(${facturaItems.cantidad})`;
  const masVendidos = await db
    .select({
      productoId: facturaItems.productoId,
      codigo: facturaItems.codigo,
      descripcion: facturaItems.descripcion,
      unidades,
      importe: sql<number>`sum(${facturaItems.subtotal})`,
    })
    .from(facturaItems)
    .innerJoin(facturas, eq(facturas.id, facturaItems.facturaId))
    .where(and(emitida, gte(facturas.fecha, desdeMes), lt(facturas.fecha, hasta)))
    .groupBy(facturaItems.productoId)
    .orderBy(desc(unidades))
    .limit(5);

  return {
    hoy: delDia,
    mes: {
      ...delMes,
      ticketPromedio: delMes.cantidad ? Math.round(delMes.importe / delMes.cantidad) : 0,
    },
    cuentasCorrientes: {
      totalAdeudado: Number(cuentas?.totalAdeudado ?? 0),
      clientesConSaldo: Number(cuentas?.clientesConSaldo ?? 0),
    },
    bajoMinimo: { cantidad: bajo.cantidad },
    ventasDiarias,
    porFormaDePago,
    masVendidos: masVendidos.map((m) => ({
      ...m,
      unidades: Number(m.unidades),
      importe: Number(m.importe),
    })),
  };
}

export type Tablero = Awaited<ReturnType<typeof obtenerTablero>>;
