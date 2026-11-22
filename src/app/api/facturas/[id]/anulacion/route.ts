// POST /api/facturas/{id}/anulacion — RF-V9 (admin).
import { idDeRuta, ruta } from "@/server/api";
import { anularFactura } from "@/server/servicios/facturas";

export const POST = ruta(({ usuario, params, body }) =>
  anularFactura(usuario, idDeRuta(params.id, "La factura"), body),
);
