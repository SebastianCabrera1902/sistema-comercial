import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { Paginador } from "@/components/comunes/filtros-url";
import { Cifra, Pila } from "@/components/comunes/primitivas";
import { NAV_CLIENTES, SubNav } from "@/components/comunes/subnav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarClientes } from "@/server/servicios/clientes";

export const metadata: Metadata = { title: "Saldos" };

/** /clientes/saldos — RF-C6. Clientes con deuda, de mayor a menor, con el total adeudado. */
export default async function PaginaSaldos({ searchParams }: PageProps<"/clientes/saldos">) {
  const usuario = await exigirUsuarioPagina();
  const sp = await parametros(searchParams);
  const r = await listarClientes(usuario, { ...sp, conDeuda: "true", orden: "saldo" });
  const totalAdeudado = "totalAdeudado" in r ? r.totalAdeudado : 0;

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Clientes" descripcion="Clientes con deuda en cuenta corriente." />
      <SubNav items={NAV_CLIENTES} />

      <Card className="max-w-sm">
        <CardHeader>
          <CardDescription>Total adeudado</CardDescription>
          <CardTitle className="text-3xl text-destructive">
            <Cifra>{moneda(totalAdeudado)}</Cifra>
          </CardTitle>
          <CardDescription>{r.total} cliente(s) con saldo</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          {r.data.length === 0 ? (
            <EstadoVacio titulo="Ningún cliente tiene deuda" descripcion="¡Las cuentas están al día!" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Límite</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clientes/${c.id}?tab=cuenta`} className="font-medium hover:underline">
                        {c.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.tipoDoc} {c.nroDoc}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      <Cifra>{c.limiteCredito === null ? "Sin límite" : moneda(c.limiteCredito)}</Cifra>
                    </TableCell>
                    <TableCell className="text-right">
                      <Cifra className="font-semibold text-destructive">{moneda(c.saldo)}</Cifra>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Paginador page={r.page} pageSize={r.pageSize} total={r.total} />
        </CardContent>
      </Card>
    </Pila>
  );
}
