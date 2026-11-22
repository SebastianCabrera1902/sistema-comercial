// GET /api/auth/me — RF-U2. Usuario conectado (401 si no hay sesión).
import { ruta } from "@/server/api";

export const GET = ruta(async ({ usuario }) => usuario);
