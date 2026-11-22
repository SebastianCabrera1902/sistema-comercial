// PUT /api/auth/password — RF-U5. Cambio de la propia contraseña.
import { ruta } from "@/server/api";
import { cambiarPassword } from "@/server/servicios/auth";

export const PUT = ruta(async ({ usuario, body }) => {
  await cambiarPassword(usuario, body);
  return undefined; // 204
});
