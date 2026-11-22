// /api/clientes — RF-C1 y RF-C6 (listado), RF-C2 y RF-V2 (alta).
import { queryAObjeto, ruta } from "@/server/api";
import { crearCliente, listarClientes } from "@/server/servicios/clientes";

export const GET = ruta(({ usuario, query }) => listarClientes(usuario, queryAObjeto(query)));

export const POST = ruta(({ usuario, body }) => crearCliente(usuario, body), { status: 201 });
