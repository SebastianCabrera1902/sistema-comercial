/**
 * Módulo ÚNICO de formatos (pautas 10.6). Los componentes no formatean por
 * su cuenta: siempre llaman a estas funciones.
 *
 * - Moneda en formato argentino: $ 12.345,50 (los importes vienen en centavos).
 * - Fechas dd/mm/aaaa y hora de Argentina.
 * - Numeración de facturas 0001-00000001 y de recibos R 0001-00000001.
 */

const ZONA = "America/Argentina/Buenos_Aires";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/** 1234550 → "$ 12.345,50" */
export function moneda(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "—";
  return formatoMoneda.format(centavos / 100).replace(/ /g, " ");
}

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatoHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO UTC → "29/10/2026" (hora de Argentina) */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatoFecha.format(new Date(iso));
}

/** ISO UTC → "29/10/2026 15:24" */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${formatoFecha.format(d)} ${formatoHora.format(d)}`;
}

const pad = (n: number, largo: number) => String(n).padStart(largo, "0");

/** (1, 1233) → "0001-00001233" */
export function numeroFactura(puntoVenta: number, numero: number): string {
  return `${pad(puntoVenta, 4)}-${pad(numero, 8)}`;
}

/** 341 → "R 0001-00000341" */
export function numeroRecibo(numero: number, puntoVenta = 1): string {
  return `R ${numeroFactura(puntoVenta, numero)}`;
}

/** Deja solo los dígitos de un documento: "28.456.123" → "28456123". */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Muestra un documento con puntos (DNI) o guiones (CUIT). */
export function documento(tipo: "DNI" | "CUIT", valor: string): string {
  const d = soloDigitos(valor);
  if (tipo === "CUIT" && d.length === 11) {
    return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
  }
  if (tipo === "DNI") return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return valor;
}

/** Texto ingresado por el usuario ("12.345,50" o "12345.5") → centavos. */
export function pesosACentavos(texto: string): number | null {
  const limpio = texto.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!limpio) return null;
  // Formato argentino: el punto separa miles y la coma los decimales.
  const normal = limpio.includes(",")
    ? limpio.replace(/\./g, "").replace(",", ".")
    : limpio;
  const valor = Number(normal);
  if (!Number.isFinite(valor)) return null;
  return Math.round(valor * 100);
}

/** Centavos → texto para un input editable: 1234550 → "12345,50". */
export function centavosATexto(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export const etiquetaFormaPago: Record<string, string> = {
  contado: "Contado",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
};

export const etiquetaMedioPago: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta de débito",
};

export const etiquetaTipoMovimiento: Record<string, string> = {
  venta: "Venta",
  anulacion: "Anulación",
  ingreso: "Ingreso",
  egreso: "Egreso",
};
