/** Convierte los searchParams de una página en un objeto plano de strings. */
export async function parametros(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Record<string, string>> {
  const sp = await searchParams;
  const resultado: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(sp)) {
    const v = Array.isArray(valor) ? valor[0] : valor;
    if (v !== undefined && v !== "") resultado[clave] = v;
  }
  return resultado;
}
