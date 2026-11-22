// /api/categorias — RF-P7.
import { ruta } from "@/server/api";
import { crearCategoria, listarCategorias } from "@/server/servicios/categorias";

export const GET = ruta(({ usuario, query }) =>
  listarCategorias(usuario, query.get("todas") === "true"),
);

export const POST = ruta(({ usuario, body }) => crearCategoria(usuario, body), { status: 201 });
