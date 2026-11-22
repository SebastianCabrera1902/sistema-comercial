/**
 * Envoltorio común de los Route Handlers (pautas 10.3).
 *
 * Hace lo que es igual en las 31 rutas:
 *   1. exige una sesión válida (401 si no hay),
 *   2. resuelve los parámetros de la URL y lee el cuerpo JSON (400 si es inválido),
 *   3. llama a la función de la ruta, que solo invoca a un servicio,
 *   4. convierte cualquier error al formato estándar de la sección 11.1.
 *
 * Con esto cada route.ts queda en pocas líneas y sin reglas de negocio.
 */
import { ApiError, errores } from "./errores";
import type { UsuarioSesion } from "./permisos";
import { obtenerUsuarioActual } from "./sesion";

type Contexto = {
  usuario: UsuarioSesion;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
};

type Opciones = {
  /** Solo POST /api/auth/login es pública. */
  publica?: boolean;
  /** Código HTTP de éxito (200 por defecto, 201 para altas). */
  status?: number;
};

export function ruta(
  manejador: (ctx: Contexto) => Promise<unknown>,
  opciones: Opciones = {},
) {
  return async (
    request: Request,
    contexto: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    try {
      let usuario: UsuarioSesion | null = null;
      if (!opciones.publica) {
        usuario = await obtenerUsuarioActual();
        if (!usuario) throw errores.noAutenticado();
      }

      const params = (await contexto?.params) ?? {};
      const query = new URL(request.url).searchParams;
      const body = await leerCuerpo(request);

      const resultado = await manejador({
        usuario: usuario as UsuarioSesion,
        params,
        query,
        body,
      });

      if (resultado === undefined) return new Response(null, { status: 204 });
      return Response.json(resultado, { status: opciones.status ?? 200 });
    } catch (error) {
      return respuestaDeError(error);
    }
  };
}

async function leerCuerpo(request: Request): Promise<unknown> {
  if (!["POST", "PUT", "PATCH"].includes(request.method)) return undefined;
  const texto = await request.text();
  if (!texto.trim()) return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw new ApiError(400, "JSON_INVALIDO", "El cuerpo no es JSON válido.");
  }
}

/** Arma la respuesta de error estándar. Un error inesperado nunca muestra su detalle. */
export function respuestaDeError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined && { details: error.details }),
        },
      },
      { status: error.status },
    );
  }
  console.error("[ERROR_INTERNO]", error); // queda en el log del servidor
  return Response.json(
    { error: { code: "ERROR_INTERNO", message: "Ocurrió un error inesperado." } },
    { status: 500 },
  );
}

/** Convierte el [id] de la URL en número; si no es válido, responde 404. */
export function idDeRuta(valor: string | undefined, que = "El recurso"): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw errores.noEncontrado(que);
  return id;
}

/** Pasa los parámetros de la query a un objeto para validarlos con Zod. */
export function queryAObjeto(query: URLSearchParams): Record<string, string> {
  return Object.fromEntries(query.entries());
}
