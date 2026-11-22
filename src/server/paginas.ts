import { notFound } from "next/navigation";
import { ApiError } from "./errores";

/** Lee el [id] de una página dinámica; si no es un número válido, muestra 404. */
export async function idDePagina(params: Promise<{ id: string }>): Promise<number> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return id;
}

/** En una página: si el servicio responde 404, muestra la página "no encontrado". */
export async function o404<T>(promesa: Promise<T>): Promise<T> {
  try {
    return await promesa;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
