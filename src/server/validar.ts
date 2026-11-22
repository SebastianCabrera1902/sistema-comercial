import type { z } from "zod";
import { detallesDeZod, errores } from "./errores";

/**
 * Primer paso de todo servicio: validar la entrada con el esquema compartido.
 * Si falla, lanza 422 VALIDACION con el detalle por campo.
 */
export function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.infer<T> {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) throw errores.validacion(detallesDeZod(resultado.error));
  return resultado.data;
}

/** Respuesta paginada estándar (sección 11.1). */
export function paginado<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, page, pageSize, total };
}

/** Detecta una violación de índice único de SQLite/libSQL. */
export function esErrorUnico(error: unknown): boolean {
  const texto = String((error as { message?: string })?.message ?? error);
  const causa = String((error as { cause?: { message?: string } })?.cause?.message ?? "");
  return /UNIQUE constraint failed/i.test(texto) || /UNIQUE constraint failed/i.test(causa);
}
