// /api/facturas — RF-V8 (listado) y RF-V1 a RF-V6 (emisión).
import { queryAObjeto, ruta } from "@/server/api";
import { emitirFactura, listarFacturas } from "@/server/servicios/facturas";

export const GET = ruta(({ usuario, query }) => listarFacturas(usuario, queryAObjeto(query)));

export const POST = ruta(({ usuario, body }) => emitirFactura(usuario, body), { status: 201 });
