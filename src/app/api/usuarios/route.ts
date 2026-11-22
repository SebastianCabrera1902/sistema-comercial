// /api/usuarios — RF-U4 (admin).
import { queryAObjeto, ruta } from "@/server/api";
import { crearUsuario, listarUsuarios } from "@/server/servicios/usuarios";

export const GET = ruta(({ usuario, query }) => listarUsuarios(usuario, queryAObjeto(query)));

export const POST = ruta(({ usuario, body }) => crearUsuario(usuario, body), { status: 201 });
