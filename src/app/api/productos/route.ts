// /api/productos — RF-P1 (listar) y RF-P2 (alta, admin).
import { queryAObjeto, ruta } from "@/server/api";
import { crearProducto, listarProductos } from "@/server/servicios/productos";

export const GET = ruta(({ usuario, query }) => listarProductos(usuario, queryAObjeto(query)));

export const POST = ruta(({ usuario, body }) => crearProducto(usuario, body), { status: 201 });
