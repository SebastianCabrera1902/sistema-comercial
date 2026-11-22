import type { Metadata } from "next";
import Link from "next/link";
import { DialogoCliente } from "@/components/clientes/dialogo-cliente";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { Buscador, FiltroSelect, Paginador } from "@/components/comunes/filtros-url";
import { InsigniaActivo } from "@/components/comunes/insignias";
import { Cifra, Fila, Pila, Texto } from "@/components/comunes/primitivas";
import { NAV_CLIENTES, SubNav } from "@/components/comunes/subnav";
import { Badge } from "@/components/ui/badge";
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
import { moneda } from "@/lib/formato";
import { parametros } from "@/lib/parametros";
import { cn } from "@/lib/utils";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarClientes } from "@/server/servicios/clientes";

export const metadata: Metadata = { title: "Clientes" };

/** /clientes — RF-C1. Listado con búsqueda por nombre o documento y saldo. */
export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const usuario = await exigirUsuarioPagina();
  const { data, page, pageSize, total } = await listarClientes(
    usuario,
    await parametros(searchParams),
  );

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Clientes" descripcion="Clientes registrados y sus cuentas corrientes.">
        <DialogoCliente>
          <Button>Nuevo cliente</Button>
        </DialogoCliente>
      </EncabezadoPagina>
      <SubNav items={NAV_CLIENTES} />

      <Card>
        <CardContent>
          <Pila>
            <Fila>
              <Buscador placeholder="Buscar por nombre o documento" />
              <FiltroSelect
                parametro="activo"
                todos="Solo activos"
                opciones={[
                  { valor: "false", etiqueta: "Solo dados de baja" },
                  { valor: "todos", etiqueta: "Todos" },
                ]}
              />
            </Fila>
            {data.length === 0 ? (
              <EstadoVacio
                titulo="No hay clientes que coincidan"
                descripcion="Probá con otra búsqueda o cargá un cliente nuevo."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden lg:table-cell">Cuenta corriente</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((c) => (
                    <TableRow key={c.id} className={cn(!c.activo && "opacity-60")}>
                      <TableCell>
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                          {c.nombre}
                        </Link>
                        {!c.activo && <InsigniaActivo activo={false} />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Texto variante="chico">{c.tipoDoc}</Texto>
                        <Cifra>{c.nroDoc}</Cifra>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{c.telefono ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {c.cuentaCorriente ? (
                          <Badge variant="secondary">Habilitada</Badge>
                        ) : (
                          <Texto variante="chico">No</Texto>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Cifra className={cn(c.saldo > 0 && "font-semibold text-destructive")}>
                          {moneda(c.saldo)}
                        </Cifra>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Paginador page={page} pageSize={pageSize} total={total} />
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}
