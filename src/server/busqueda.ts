/**
 * Búsqueda sin distinguir mayúsculas ni acentos ("lampara" encuentra "Lámpara").
 *
 * SQLite no trae una función para quitar acentos, así que se reemplazan las
 * vocales acentuadas y la ñ en la columna, y se normaliza el texto buscado en JS.
 */
import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

const REEMPLAZOS: [string, string][] = [
  ["á", "a"], ["é", "e"], ["í", "i"], ["ó", "o"], ["ú", "u"], ["ü", "u"], ["ñ", "n"],
  ["Á", "a"], ["É", "e"], ["Í", "i"], ["Ó", "o"], ["Ú", "u"], ["Ü", "u"], ["Ñ", "n"],
];

/** Texto en minúsculas y sin acentos: "Lámpara" → "lampara". */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** La misma normalización, pero aplicada a una columna en SQL. */
function columnaNormalizada(columna: SQLWrapper): SQL {
  let expresion = sql`lower(${columna})`;
  for (const [con, sin] of REEMPLAZOS) expresion = sql`replace(${expresion}, ${con}, ${sin})`;
  return expresion;
}

/** Condición: la columna contiene el texto, ignorando mayúsculas y acentos. */
export function contiene(columna: SQLWrapper, texto: string): SQL {
  return sql`${columnaNormalizada(columna)} like ${`%${normalizarTexto(texto)}%`}`;
}
