// GET /api/tablero — RF-T1 a RF-T3. Todo lo que muestra la pantalla de inicio.
import { ruta } from "@/server/api";
import { obtenerTablero } from "@/server/servicios/tablero";

export const GET = ruta(({ usuario }) => obtenerTablero(usuario));
