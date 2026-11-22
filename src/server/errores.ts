/**
 * Errores de la API (sección 11.8).
 *
 * Los servicios lanzan SIEMPRE un ApiError. El envoltorio de las rutas
 * (server/api.ts) lo traduce a la respuesta JSON estándar:
 *   { "error": { "code", "message", "details" } }
 */
import type { ZodError } from "zod";

export type CodigoError =
  | "JSON_INVALIDO"
  | "NO_AUTENTICADO"
  | "CREDENCIALES_INVALIDAS"
  | "SIN_PERMISO"
  | "NO_ENCONTRADO"
  | "CODIGO_DUPLICADO"
  | "DOCUMENTO_DUPLICADO"
  | "EMAIL_DUPLICADO"
  | "NOMBRE_DUPLICADO"
  | "CATEGORIA_EN_USO"
  | "STOCK_INSUFICIENTE"
  | "FACTURA_ANULADA"
  | "VALIDACION"
  | "PRODUCTO_INACTIVO"
  | "CUENTA_CORRIENTE_NO_HABILITADA"
  | "LIMITE_CREDITO_EXCEDIDO"
  | "MONTO_INSUFICIENTE"
  | "PAGO_SUPERA_DEUDA"
  | "SALDO_PENDIENTE"
  | "CONTRASENA_ACTUAL_INCORRECTA"
  | "OPERACION_SOBRE_SI_MISMO"
  | "ERROR_INTERNO";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: CodigoError,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Detalle por campo, como lo espera el formulario: { campo, mensaje }. */
export type DetalleCampo = { campo: string; mensaje: string };

/** Convierte los problemas de Zod al formato de detalles de la API. */
export function detallesDeZod(error: ZodError): DetalleCampo[] {
  return error.issues.flatMap((issue) => {
    // Campos no previstos en un esquema estricto (p. ej. "existencia" en un PATCH).
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((k) => ({
        campo: k,
        mensaje: "Este campo no se puede enviar.",
      }));
    }
    return [{ campo: issue.path.join(".") || "general", mensaje: issue.message }];
  });
}

// Atajos para los errores más comunes.
export const errores = {
  noAutenticado: () =>
    new ApiError(401, "NO_AUTENTICADO", "Tu sesión no es válida. Iniciá sesión nuevamente."),
  sinPermiso: () =>
    new ApiError(403, "SIN_PERMISO", "No tenés permiso para realizar esta operación."),
  noEncontrado: (que = "El recurso") =>
    new ApiError(404, "NO_ENCONTRADO", `${que} no existe.`),
  validacion: (details: DetalleCampo[], message = "Hay campos con errores.") =>
    new ApiError(422, "VALIDACION", message, details),
};
