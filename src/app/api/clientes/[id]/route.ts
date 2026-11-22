// /api/clientes/{id} — RF-C3 (ficha), RF-C2 y RF-C7 (edición y baja lógica).
import { idDeRuta, ruta } from "@/server/api";
import { editarCliente, obtenerCliente } from "@/server/servicios/clientes";

export const GET = ruta(({ usuario, params }) =>
  obtenerCliente(usuario, idDeRuta(params.id, "El cliente")),
);

export const PATCH = ruta(({ usuario, params, body }) =>
  editarCliente(usuario, idDeRuta(params.id, "El cliente"), body),
);
