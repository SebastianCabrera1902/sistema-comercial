import Link from "next/link";
import { AlertTriangleIcon, CalendarIcon, ReceiptIcon, WalletIcon } from "lucide-react";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { Cifra, Grilla, Pila, Texto } from "@/components/comunes/primitivas";
import { GraficoFormasDePago, GraficoVentasDiarias } from "@/components/tablero/graficos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { etiquetaFormaPago, moneda } from "@/lib/formato";
import { exigirUsuarioPagina } from "@/server/sesion";
import { obtenerTablero } from "@/server/servicios/tablero";

/** / — Tablero de inicio (RF-T1 a RF-T3). */
export default async function PaginaInicio() {
  const usuario = await exigirUsuarioPagina();
  const t = await obtenerTablero(usuario);

  const indicadores = [
    {
      titulo: "Ventas de hoy",
      valor: moneda(t.hoy.importe),
      detalle: `${t.hoy.cantidad} factura(s)`,
      icono: ReceiptIcon,
      href: "/ventas",
    },
    {
      titulo: "Ventas del mes",
      valor: moneda(t.mes.importe),
      detalle: `${t.mes.cantidad} factura(s) · ticket promedio ${moneda(t.mes.ticketPromedio)}`,
      icono: CalendarIcon,
      href: "/ventas",
    },
    {
      titulo: "Adeudado en cuentas corrientes",
      valor: moneda(t.cuentasCorrientes.totalAdeudado),
      detalle: `${t.cuentasCorrientes.clientesConSaldo} cliente(s) con saldo`,
      icono: WalletIcon,
      href: "/clientes/saldos",
    },
    {
      titulo: "Productos bajo el mínimo",
      valor: String(t.bajoMinimo.cantidad),
      detalle: "para reponer",
      icono: AlertTriangleIcon,
      href: "/productos?bajoMinimo=true",
    },
  ];

  return (
    <Pila className="gap-6">
      <EncabezadoPagina
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        descripcion="Resumen de ventas y cuentas. Solo cuentan las facturas emitidas."
      >
        <Button asChild>
          <Link href="/ventas/nueva">Nueva venta</Link>
        </Button>
      </EncabezadoPagina>

      {/* RF-T1 */}
      <Grilla columnas={4}>
        {indicadores.map((i) => (
          <Link key={i.titulo} href={i.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader>
                <CardDescription className="flex items-center justify-between gap-2">
                  {i.titulo}
                  <i.icono className="size-4 text-muted-foreground" />
                </CardDescription>
                <CardTitle className="text-2xl">
                  <Cifra>{i.valor}</Cifra>
                </CardTitle>
                <Texto variante="chico">{i.detalle}</Texto>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </Grilla>

      {/* RF-T2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas diarias</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoVentasDiarias datos={t.ventasDiarias} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventas del mes por forma de pago</CardTitle>
            <CardDescription>Importe facturado</CardDescription>
          </CardHeader>
          <CardContent>
            <Pila>
              <GraficoFormasDePago datos={t.porFormaDePago} />
              <Table>
                <TableBody>
                  {t.porFormaDePago.map((f) => (
                    <TableRow key={f.forma}>
                      <TableCell>{etiquetaFormaPago[f.forma]}</TableCell>
                      <TableCell className="text-right">
                        <Cifra>{moneda(f.importe)}</Cifra>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Pila>
          </CardContent>
        </Card>
      </div>

      {/* RF-T3 */}
      <Card>
        <CardHeader>
          <CardTitle>Los 5 más vendidos del mes</CardTitle>
          <CardDescription>Por unidades vendidas</CardDescription>
        </CardHeader>
        <CardContent>
          {t.masVendidos.length === 0 ? (
            <EstadoVacio titulo="Todavía no hay ventas este mes" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.masVendidos.map((m, i) => (
                  <TableRow key={m.productoId}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Link href={`/productos/${m.productoId}`} className="font-medium hover:underline">
                        {m.descripcion}
                      </Link>
                      <Texto variante="chico" className="font-mono">
                        {m.codigo}
                      </Texto>
                    </TableCell>
                    <TableCell className="text-right">
                      <Cifra>{m.unidades}</Cifra>
                    </TableCell>
                    <TableCell className="text-right">
                      <Cifra>{moneda(m.importe)}</Cifra>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Pila>
  );
}
