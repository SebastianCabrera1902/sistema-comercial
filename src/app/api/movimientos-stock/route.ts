// GET /api/movimientos-stock — RF-P6. Historial de todos los productos.
import { queryAObjeto, ruta } from "@/server/api";
import { listarMovimientos } from "@/server/servicios/stock";

export const GET = ruta(({ usuario, query }) => listarMovimientos(usuario, queryAObjeto(query)));
