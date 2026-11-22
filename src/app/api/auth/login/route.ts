// POST /api/auth/login — RF-U1. Única ruta pública.
import { ruta } from "@/server/api";
import { abrirSesion } from "@/server/sesion";
import { login } from "@/server/servicios/auth";

export const POST = ruta(
  async ({ body }) => {
    const usuario = await login(body);
    await abrirSesion(usuario.id);
    return usuario;
  },
  { publica: true },
);
