// POST /api/clientes/{id}/pagos — RF-C5. Pago a cuenta con recibo.
import { idDeRuta, ruta } from "@/server/api";
import { registrarPago } from "@/server/servicios/pagos";

export const POST = ruta(
  ({ usuario, params, body }) => registrarPago(usuario, idDeRuta(params.id, "El cliente"), body),
  { status: 201 },
);
