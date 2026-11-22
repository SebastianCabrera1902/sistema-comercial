// GET /api/facturas/proximo-numero — RF-V1. Solo informativo.
// (Los segmentos fijos como este tienen prioridad sobre [id].)
import { ruta } from "@/server/api";
import { proximoNumeroInformativo } from "@/server/servicios/facturas";

export const GET = ruta(({ usuario }) => proximoNumeroInformativo(usuario));
