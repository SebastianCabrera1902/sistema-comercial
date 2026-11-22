// POST /api/auth/logout — RF-U1. Borra la cookie de sesión.
import { ruta } from "@/server/api";
import { cerrarSesion } from "@/server/sesion";

export const POST = ruta(async () => {
  await cerrarSesion();
  return undefined; // 204
});
