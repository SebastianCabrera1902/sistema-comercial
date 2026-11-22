/**
 * Cálculo de días en hora de Argentina.
 *
 * Argentina usa UTC−3 todo el año (sin horario de verano), así que el día
 * "2026-10-29" en Argentina va de 2026-10-29T03:00:00Z a 2026-10-30T03:00:00Z.
 * Las fechas se guardan en UTC y los filtros por día se traducen con esto.
 */
const DESFASE_MS = 3 * 60 * 60 * 1000;

/** "AAAA-MM-DD" del día actual en Argentina. */
export function hoyAR(base = new Date()): string {
  return new Date(base.getTime() - DESFASE_MS).toISOString().slice(0, 10);
}

/** Instante (ISO UTC) en que empieza un día de Argentina. */
export function inicioDiaAR(dia: string): string {
  return new Date(`${dia}T03:00:00.000Z`).toISOString();
}

/** Instante (ISO UTC) en que empieza el día SIGUIENTE (límite exclusivo). */
export function finDiaAR(dia: string): string {
  return new Date(new Date(`${dia}T03:00:00.000Z`).getTime() + 86_400_000).toISOString();
}

/** Suma (o resta) días a una fecha "AAAA-MM-DD". */
export function sumarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Primer día del mes de una fecha "AAAA-MM-DD". */
export function inicioMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

/** Convierte un instante ISO UTC al día de Argentina "AAAA-MM-DD". */
export function diaARDeISO(iso: string): string {
  return hoyAR(new Date(iso));
}
