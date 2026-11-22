/**
 * Cliente de la API REST para los componentes del navegador.
 * Si la respuesta es un error, lanza un ErrorApi con el formato estándar.
 */
export type DetalleError = { campo?: string; mensaje?: string; [clave: string]: unknown };

export class ErrorApi extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: DetalleError[],
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  url: string,
  opciones: { method?: string; body?: unknown } = {},
): Promise<T> {
  const respuesta = await fetch(url, {
    method: opciones.method ?? (opciones.body ? "POST" : "GET"),
    headers: opciones.body ? { "Content-Type": "application/json" } : undefined,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });

  if (respuesta.status === 204) return undefined as T;
  const json = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const e = json?.error;
    if (respuesta.status === 401 && typeof window !== "undefined" && e?.code === "NO_AUTENTICADO") {
      window.location.href = "/login";
    }
    throw new ErrorApi(
      respuesta.status,
      e?.code ?? "ERROR_INTERNO",
      e?.message ?? "No se pudo completar la operación.",
      e?.details,
    );
  }
  return json as T;
}
