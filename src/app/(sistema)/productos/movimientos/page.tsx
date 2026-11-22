import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { FiltroFecha, FiltroSelect, Paginador } from "@/components/comunes/filtros-url";
import { Fila, Pila } from "@/components/comunes/primitivas";
import { NAV_PRODUCTOS, SubNav } from "@/components/comunes/subnav";
import { TablaMovimientos } from "@/components/productos/tabla-movimientos";
import { Card, CardContent } from "@/components/ui/card";
import { etiquetaTipoMovimiento } from "@/lib/formato";
import { parametros } from "@/lib/parametros";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarMovimientos } from "@/server/servicios/stock";

export const metadata: Metadata = { title: "Movimientos de stock" };

/** /productos/movimientos — RF-P6. Historial de stock de todos los productos. */
export default async function PaginaMovimientos({ searchParams }: PageProps<"/productos/movimientos">) {
  const usuario = await exigirUsuarioPagina();
  const { data, page, pageSize, total } = await listarMovimientos(
    usuario,
    await parametros(searchParams),
  );

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Productos" descripcion="Existencias: historial de movimientos de stock." />
      <SubNav items={NAV_PRODUCTOS} />
      <Card>
        <CardContent>
          <Pila>
            <Fila>
              <FiltroSelect
                parametro="tipo"
                todos="Todos los tipos"
                opciones={Object.entries(etiquetaTipoMovimiento).map(([valor, etiqueta]) => ({
                  valor,
                  etiqueta,
                }))}
              />
              <FiltroFecha parametro="desde" etiqueta="Desde" />
              <FiltroFecha parametro="hasta" etiqueta="Hasta" />
            </Fila>
            <TablaMovimientos movimientos={data} mostrarProducto />
            <Paginador page={page} pageSize={pageSize} total={total} />
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}
