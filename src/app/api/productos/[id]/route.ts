// /api/productos/{id} — RF-P1 (consulta), RF-P2 y RF-P3 (edición y baja, admin).
import { idDeRuta, ruta } from "@/server/api";
import { editarProducto, obtenerProducto } from "@/server/servicios/productos";

export const GET = ruta(({ usuario, params }) =>
  obtenerProducto(usuario, idDeRuta(params.id, "El producto")),
);

export const PATCH = ruta(({ usuario, params, body }) =>
  editarProducto(usuario, idDeRuta(params.id, "El producto"), body),
);
