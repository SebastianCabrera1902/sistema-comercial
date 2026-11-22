/**
 * Pagos a cuenta corriente (RF-C5; reglas 4, 8 y 11).
 */
import { eq, sql } from "drizzle-orm";
import { db, type Ejecutor } from "@/db";
import { clientes, movimientosCuenta, pagos, usuarios } from "@/db/schema";
import { pagoSchema } from "@/lib/esquemas";
import { numeroRecibo } from "@/lib/formato";
import { ApiError, errores } from "../errores";
import type { UsuarioSesion } from "../permisos";
import { validar } from "../validar";
import { obtenerClienteBasico, saldoCliente } from "./clientes";

/**
 * RF-C5. Registra un pago: graba el recibo con su número y el crédito en la
 * cuenta corriente EN UNA SOLA TRANSACCIÓN. El pago no puede superar la
 * deuda (regla 8: no se admiten saldos a favor).
 */
export async function registrarPago(usuario: UsuarioSesion, clienteId: number, entrada: unknown) {
  const datos = validar(pagoSchema, entrada);

  const pagoId = await db.transaction(async (tx) => {
    const cliente = await obtenerClienteBasico(tx, clienteId);
    if (!cliente.activo || !cliente.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "El cliente no tiene la cuenta corriente habilitada.",
      );
    }

    const saldo = await saldoCliente(tx, clienteId);
    if (datos.importe > saldo) {
      throw new ApiError(422, "PAGO_SUPERA_DEUDA", "El pago supera la deuda del cliente.", [
        { campo: "importe", mensaje: "El pago no puede superar la deuda." },
      ]);
    }

    // Numeración propia de los recibos, correlativa y sin huecos (regla 4):
    // se calcula dentro de la transacción de escritura, así nunca se repite.
    const numero = await proximoNumeroRecibo(tx);

    const [pago] = await tx
      .insert(pagos)
      .values({
        numero,
        clienteId,
        usuarioId: usuario.id,
        importe: datos.importe,
        medio: datos.medio,
        observacion: datos.observacion,
      })
      .returning({ id: pagos.id });

    await tx.insert(movimientosCuenta).values({
      clienteId,
      tipo: "credito",
      importe: datos.importe,
      descripcion: `Recibo ${numeroRecibo(numero)}`,
      pagoId: pago.id,
    });

    return pago.id;
  });

  return obtenerPago(usuario, pagoId);
}

async function proximoNumeroRecibo(tx: Ejecutor): Promise<number> {
  const [fila] = await tx
    .select({ ultimo: sql<number>`coalesce(max(${pagos.numero}), 0)` })
    .from(pagos);
  return Number(fila.ultimo) + 1;
}

/** Recibo para reimprimir (GET /api/pagos/{id}). */
export async function obtenerPago(_usuario: UsuarioSesion | null, id: number) {
  const [fila] = await db
    .select({
      id: pagos.id,
      numero: pagos.numero,
      fecha: pagos.fecha,
      importe: pagos.importe,
      medio: pagos.medio,
      observacion: pagos.observacion,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      tipoDoc: clientes.tipoDoc,
      nroDoc: clientes.nroDoc,
      domicilio: clientes.domicilio,
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.nombre,
    })
    .from(pagos)
    .innerJoin(clientes, eq(clientes.id, pagos.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, pagos.usuarioId))
    .where(eq(pagos.id, id));
  if (!fila) throw errores.noEncontrado("El recibo");

  return {
    id: fila.id,
    numeroRecibo: numeroRecibo(fila.numero),
    fecha: fila.fecha,
    cliente: {
      id: fila.clienteId,
      nombre: fila.clienteNombre,
      tipoDoc: fila.tipoDoc,
      nroDoc: fila.nroDoc,
      domicilio: fila.domicilio,
    },
    importe: fila.importe,
    medio: fila.medio,
    observacion: fila.observacion,
    usuario: { id: fila.usuarioId, nombre: fila.usuarioNombre },
    saldoCliente: await saldoCliente(db, fila.clienteId),
  };
}

export type ReciboPublico = Awaited<ReturnType<typeof obtenerPago>>;
