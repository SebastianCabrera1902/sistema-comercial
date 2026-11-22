/**
 * Permisos por rol (sección 3).
 *
 * Ocultar un botón en la interfaz es solo una ayuda visual: el permiso lo
 * decide SIEMPRE el servicio llamando a exigirRol(). Así, aunque un vendedor
 * llame a la API directamente, recibe 403 (lista de control 10.8, punto 2).
 */
import type { Rol } from "@/db/schema";
import { errores } from "./errores";

export type UsuarioSesion = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
};

export function exigirRol(usuario: UsuarioSesion, ...roles: Rol[]) {
  if (!roles.includes(usuario.rol)) throw errores.sinPermiso();
}

export const esAdmin = (usuario: UsuarioSesion) => usuario.rol === "admin";
