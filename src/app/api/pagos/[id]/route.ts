// GET /api/pagos/{id} — RF-C5. Recibo para reimprimir.
import { idDeRuta, ruta } from "@/server/api";
import { obtenerPago } from "@/server/servicios/pagos";

export const GET = ruta(({ usuario, params }) => obtenerPago(usuario, idDeRuta(params.id, "El recibo")));
