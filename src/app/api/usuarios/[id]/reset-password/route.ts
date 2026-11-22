// POST /api/usuarios/{id}/reset-password — RF-U5 (admin).
import { idDeRuta, ruta } from "@/server/api";
import { restablecerPassword } from "@/server/servicios/usuarios";

export const POST = ruta(({ usuario, params }) =>
  restablecerPassword(usuario, idDeRuta(params.id, "El usuario")),
);
