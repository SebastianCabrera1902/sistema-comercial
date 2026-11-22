// /api/productos/{id}/movimientos — RF-P6 (historial) y RF-P4/RF-P5 (ingreso y egreso, admin).
import { idDeRuta, queryAObjeto, ruta } from "@/server/api";
import { listarMovimientos, registrarMovimientoManual } from "@/server/servicios/stock";

export const GET = ruta(({ usuario, params, query }) =>
  listarMovimientos(usuario, {
    ...queryAObjeto(query),
    productoId: String(idDeRuta(params.id, "El producto")),
  }),
);

export const POST = ruta(
  ({ usuario, params, body }) =>
    registrarMovimientoManual(usuario, idDeRuta(params.id, "El producto"), body),
  { status: 201 },
);
