// GET /api/facturas/{id} — RF-V7. Factura completa.
import { idDeRuta, ruta } from "@/server/api";
import { obtenerFactura } from "@/server/servicios/facturas";

export const GET = ruta(({ usuario, params }) =>
  obtenerFactura(usuario, idDeRuta(params.id, "La factura")),
);
