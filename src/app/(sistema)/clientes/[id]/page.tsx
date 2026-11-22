import Link from "next/link";
import { AccionesCliente } from "@/components/clientes/acciones-cliente";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { FiltroFecha } from "@/components/comunes/filtros-url";
import { InsigniaActivo, InsigniaEstadoFactura, InsigniaTipo } from "@/components/comunes/insignias";
import { Cifra, Fila, Grilla, Pila, Texto } from "@/components/comunes/primitivas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { etiquetaFormaPago, fecha, fechaHora, moneda } from "@/lib/formato";
import { parametros } from "@/lib/parametros";
import { cn } from "@/lib/utils";
import { idDePagina, o404 } from "@/server/paginas";
import { exigirUsuarioPagina } from "@/server/sesion";
import { cuentaCorriente, obtenerCliente } from "@/server/servicios/clientes";

/** /clientes/[id] — RF-C3 (ficha) con la pestaña de cuenta corriente (RF-C4). */
export default async function PaginaCliente({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const usuario = await exigirUsuarioPagina();
  const id = await idDePagina(params);
  const sp = await parametros(searchParams);
  const [cliente, cuenta] = await Promise.all([
    o404(obtenerCliente(usuario, id)),
    o404(cuentaCorriente(usuario, id, { desde: sp.desde, hasta: sp.hasta })),
  ]);

  return (
    <Pila className="gap-6">
      <EncabezadoPagina
        titulo={cliente.nombre}
        descripcion={
          <Fila>
            <Texto variante="suave">
              {cliente.tipoDoc} {cliente.nroDoc}
            </Texto>
            <InsigniaActivo activo={cliente.activo} />
          </Fila>
        }
        volver={{ href: "/clientes", texto: "Clientes" }}
      >
        <AccionesCliente cliente={cliente} />
      </EncabezadoPagina>

      <Grilla columnas={4}>
        <Card>
          <CardHeader>
            <CardDescription>Saldo actual</CardDescription>
            <CardTitle className={cn("text-2xl", cliente.saldo > 0 && "text-destructive")}>
              <Cifra>{moneda(cliente.saldo)}</Cifra>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Límite de crédito</CardDescription>
            <CardTitle className="text-2xl">
              <Cifra>{cliente.limiteCredito === null ? "Sin límite" : moneda(cliente.limiteCredito)}</Cifra>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Disponible</CardDescription>
            <CardTitle className="text-2xl">
              <Cifra>{cliente.disponible === null ? "—" : moneda(cliente.disponible)}</Cifra>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cuenta corriente</CardDescription>
            <CardTitle>
              {cliente.cuentaCorriente ? (
                <Badge>Habilitada</Badge>
              ) : (
                <Badge variant="outline">No habilitada</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </Grilla>

      <Tabs defaultValue={sp.tab === "cuenta" ? "cuenta" : "datos"}>
        <TabsList>
          <TabsTrigger value="datos">Datos y facturas</TabsTrigger>
          <TabsTrigger value="cuenta">Cuenta corriente</TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="mt-4">
          <Grilla columnas={2}>
            <Card>
              <CardHeader>
                <CardTitle>Datos</CardTitle>
              </CardHeader>
              <CardContent>
                <Pila className="gap-3">
                  <Dato etiqueta="Domicilio">{cliente.domicilio ?? "—"}</Dato>
                  <Dato etiqueta="Teléfono">{cliente.telefono ?? "—"}</Dato>
                  <Dato etiqueta="Email">{cliente.email ?? "—"}</Dato>
                </Pila>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Últimas facturas</CardTitle>
              </CardHeader>
              <CardContent>
                {cliente.ultimasFacturas.length === 0 ? (
                  <EstadoVacio titulo="Todavía no tiene facturas" />
                ) : (
                  <Table>
                    <TableBody>
                      {cliente.ultimasFacturas.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <Link href={`/ventas/${f.id}`} className="font-mono text-xs hover:underline">
                              {f.numeroFormateado}
                            </Link>
                            <Texto variante="chico">
                              {fecha(f.fecha)} · {etiquetaFormaPago[f.formaPago]}
                            </Texto>
                          </TableCell>
                          <TableCell>
                            <InsigniaEstadoFactura estado={f.estado} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Cifra>{moneda(f.total)}</Cifra>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grilla>
        </TabsContent>

        <TabsContent value="cuenta" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cuenta corriente</CardTitle>
              <CardDescription>
                Débitos por ventas y créditos por pagos y anulaciones, con el saldo acumulado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Pila>
                <Fila>
                  <FiltroFecha parametro="desde" etiqueta="Desde" />
                  <FiltroFecha parametro="hasta" etiqueta="Hasta" />
                </Fila>
                {cuenta.movimientos.length === 0 ? (
                  <EstadoVacio titulo="Sin movimientos en el período" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-right">Crédito</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sp.desde && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            Saldo anterior
                          </TableCell>
                          <TableCell className="text-right">
                            <Cifra>{moneda(cuenta.saldoAnterior)}</Cifra>
                          </TableCell>
                        </TableRow>
                      )}
                      {cuenta.movimientos.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap">{fechaHora(m.fecha)}</TableCell>
                          <TableCell>
                            <Fila>
                              <InsigniaTipo
                                tipo={m.tipo}
                                etiqueta={m.tipo === "debito" ? "Débito" : "Crédito"}
                              />
                              {m.facturaId ? (
                                <Link href={`/ventas/${m.facturaId}`} className="hover:underline">
                                  {m.descripcion}
                                </Link>
                              ) : m.pagoId ? (
                                <Link href={`/clientes/recibos/${m.pagoId}`} className="hover:underline">
                                  {m.descripcion}
                                </Link>
                              ) : (
                                m.descripcion
                              )}
                            </Fila>
                          </TableCell>
                          <TableCell className="text-right">
                            <Cifra>{m.tipo === "debito" ? moneda(m.importe) : ""}</Cifra>
                          </TableCell>
                          <TableCell className="text-right">
                            <Cifra>{m.tipo === "credito" ? moneda(m.importe) : ""}</Cifra>
                          </TableCell>
                          <TableCell className="text-right">
                            <Cifra className="font-medium">{moneda(m.saldo)}</Cifra>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4}>Saldo</TableCell>
                        <TableCell className="text-right">
                          <Cifra>{moneda(cuenta.saldo)}</Cifra>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
              </Pila>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Pila>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <Pila className="gap-0.5">
      <Texto variante="chico">{etiqueta}</Texto>
      <Texto>{children}</Texto>
    </Pila>
  );
}
