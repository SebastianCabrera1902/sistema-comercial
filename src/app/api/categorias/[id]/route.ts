// PATCH /api/categorias/{id} — RF-P7 (admin).
import { idDeRuta, ruta } from "@/server/api";
import { editarCategoria } from "@/server/servicios/categorias";

export const PATCH = ruta(({ usuario, params, body }) =>
  editarCategoria(usuario, idDeRuta(params.id, "La categoría"), body),
);
