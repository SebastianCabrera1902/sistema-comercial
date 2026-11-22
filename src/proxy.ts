/**
 * Proxy de Next.js: PRIMERA barrera de la sesión (pautas 10.5).
 *
 * Si una página se pide sin una cookie de sesión con firma válida, redirige
 * al login. Es un control "optimista": la segunda barrera es cada página
 * (exigirUsuarioPagina) y la tercera, cada servicio (exigirRol).
 *
 * Las rutas /api no se redirigen: responden 401 en JSON desde el envoltorio.
 */
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarToken } from "@/server/token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const valida = (await verificarToken(request.cookies.get(COOKIE_SESION)?.value)) !== null;

  if (pathname === "/login") {
    // Con sesión no tiene sentido ver el login.
    return valida ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!valida) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // Todo menos la API, los archivos estáticos y los internos de Next.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|webp)$).*)"],
};
