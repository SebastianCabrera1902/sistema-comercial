/**
 * Token de sesión: un JWT firmado con HMAC (HS256) que se guarda en una
 * cookie httpOnly. Solo contiene el id del usuario; el resto de sus datos
 * (rol, activo) se lee de la base en cada pedido (pautas 10.5).
 *
 * Este archivo no importa la base de datos para poder usarse en el proxy.
 */
import { jwtVerify, SignJWT } from "jose";

export const COOKIE_SESION = "sesion";
export const DURACION_SESION_SEG = 60 * 60 * 12; // 12 horas

function secreto() {
  // El secreto vive solo en variables de entorno, nunca en el repositorio.
  const valor = process.env.SESSION_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.");
  }
  return new TextEncoder().encode(valor);
}

export async function firmarToken(usuarioId: number): Promise<string> {
  return new SignJWT({ uid: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(secreto());
}

/** Devuelve el id del usuario si la firma es válida y no venció; si no, null. */
export async function verificarToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}
