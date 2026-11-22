// GET /api/clientes/{id}/cuenta — RF-C4. Cuenta corriente con saldo acumulado.
import { idDeRuta, queryAObjeto, ruta } from "@/server/api";
import { cuentaCorriente } from "@/server/servicios/clientes";

export const GET = ruta(({ usuario, params, query }) =>
  cuentaCorriente(usuario, idDeRuta(params.id, "El cliente"), queryAObjeto(query)),
);
