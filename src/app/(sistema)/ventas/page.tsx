import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { Buscador, FiltroFecha, FiltroSelect, Paginador } from "@/components/comunes/filtros-url";
import { InsigniaEstadoFactura } from "@/components/comunes/insignias";
import { Cifra, Fila, Pila, Texto } from "@/components/comunes/primitivas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { etiquetaFormaPago, fechaHora, moneda } from "@/lib/formato";
import { parametros } from "@/lib/parametros";
import { cn } from "@/lib/utils";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarFacturas, listarVendedores } from "@/server/servicios/facturas";

export const metadata: Metadata = { title: "Facturas" };

/** /ventas — RF-V8. Listado de facturas con filtros, búsqueda y paginado. */
export default async function PaginaFacturas({ searchParams }: PageProps<"/ventas">) {
  const usuario = await exigirUsuarioPagina();
  const [r, vendedores] = await Promise.all([
    listarFacturas(usuario, await parametros(searchParams)),
    listarVendedores(),
  ]);

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Facturas" descripcion="Comprobantes emitidos y anulados.">
        <Button asChild>
          <Link href="/ventas/nueva">Nueva venta</Link>
        </Button>
      </EncabezadoPagina>

      <Card>
        <CardContent>
          <Pila>
            <Fila>
              <Buscador placeholder="Número o cliente" />
              <FiltroFecha parametro="desde" etiqueta="Desde" />
              <FiltroFecha parametro="hasta" etiqueta="Hasta" />
              <FiltroSelect
                parametro="forma"
                todos="Toda forma de pago"
                opciones={Object.entries(etiquetaFormaPago).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
              />
              <FiltroSelect
                parametro="vendedorId"
                todos="Todos los vendedores"
                opciones={vendedores.map((v) => ({ valor: String(v.id), etiqueta: v.nombre }))}
              />
              <FiltroSelect
                parametro="estado"
                todos="Emitidas y anuladas"
                opciones={[
                  { valor: "emitida", etiqueta: "Emitidas" },
                  { valor: "anulada", etiqueta: "Anuladas" },
                ]}
              />
            </Fila>
            <Fila className="justify-end">
              <Texto variante="suave">
                Total emitido en el filtro: <Cifra className="font-semibold text-foreground">{moneda(r.totalEmitido)}</Cifra>
              </Texto>
            </Fila>
            {r.data.length === 0 ? (
              <EstadoVacio titulo="No hay facturas que coincidan" descripcion="Probá cambiando los filtros." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Forma de pago</TableHead>
                    <TableHead className="hidden lg:table-cell">Vendedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.data.map((f) => (
                    <TableRow key={f.id} className={cn(f.estado === "anulada" && "text-muted-foreground")}>
                      <TableCell>
                        <Link href={`/ventas/${f.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                          {f.numeroFormateado}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fechaHora(f.fecha)}</TableCell>
                      <TableCell>{f.cliente?.nombre ?? "Consumidor final"}</TableCell>
                      <TableCell className="hidden md:table-cell">{etiquetaFormaPago[f.formaPago]}</TableCell>
                      <TableCell className="hidden lg:table-cell">{f.vendedor.nombre}</TableCell>
                      <TableCell>
                        <InsigniaEstadoFactura estado={f.estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Cifra className={cn("font-medium", f.estado === "anulada" && "line-through")}>
                          {moneda(f.total)}
                        </Cifra>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Paginador page={r.page} pageSize={r.pageSize} total={r.total} />
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}
