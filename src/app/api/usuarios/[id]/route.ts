// PATCH /api/usuarios/{id} — RF-U4 (admin). Edición, rol y desactivación.
import { idDeRuta, ruta } from "@/server/api";
import { editarUsuario } from "@/server/servicios/usuarios";

export const PATCH = ruta(({ usuario, params, body }) =>
  editarUsuario(usuario, idDeRuta(params.id, "El usuario"), body),
);
