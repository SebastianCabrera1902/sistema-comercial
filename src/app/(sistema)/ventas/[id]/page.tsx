import type { Metadata } from "next";
import Link from "next/link";
import { BotonImprimir } from "@/components/comprobantes/boton-imprimir";
import { Comprobante, DatoComprobante } from "@/components/comprobantes/comprobante";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { InsigniaEstadoFactura } from "@/components/comunes/insignias";
import { Cifra, Fila, Grilla, Pila, Texto } from "@/components/comunes/primitivas";
import { AnularFactura } from "@/components/ventas/anular-factura";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { etiquetaFormaPago, fechaHora, moneda } from "@/lib/formato";
import { idDePagina, o404 } from "@/server/paginas";
import { esAdmin } from "@/server/permisos";
import { exigirUsuarioPagina } from "@/server/sesion";
import { obtenerFactura } from "@/server/servicios/facturas";

export const metadata: Metadata = { title: "Factura" };

/** /ventas/[id] — RF-V7. Comprobante imprimible; RF-V9 anulación (admin). */
export default async function PaginaFactura({ params }: PageProps<"/ventas/[id]">) {
  const usuario = await exigirUsuarioPagina();
  const f = await o404(obtenerFactura(usuario, await idDePagina(params)));
  const anulada = f.estado === "anulada";

  return (
    <Pila className="gap-6">
      <EncabezadoPagina
        titulo={`Factura ${f.numeroFormateado}`}
        descripcion={<InsigniaEstadoFactura estado={f.estado} />}
        volver={{ href: "/ventas", texto: "Facturas" }}
      >
        <BotonImprimir />
        {esAdmin(usuario) && !anulada && <AnularFactura facturaId={f.id} numero={f.numeroFormateado} />}
      </EncabezadoPagina>

      {f.anulacion && (
        <Alert variant="destructive" className="no-print mx-auto w-full max-w-3xl">
          <AlertTitle>Factura anulada</AlertTitle>
          <AlertDescription>
            {fechaHora(f.anulacion.fecha)} por {f.anulacion.usuario.nombre}. Motivo: {f.anulacion.motivo}
          </AlertDescription>
        </Alert>
      )}

      <Comprobante tipo="Factura" numero={f.numeroFormateado} fechaHora={fechaHora(f.fecha)} anulado={anulada}>
        <Grilla columnas={2}>
          <DatoComprobante etiqueta="Cliente">
            {f.cliente ? (
              <Link href={`/clientes/${f.cliente.id}`} className="hover:underline">
                {f.cliente.nombre}
              </Link>
            ) : (
              "Consumidor final"
            )}
          </DatoComprobante>
          {f.cliente && (
            <DatoComprobante etiqueta="Documento">
              {f.cliente.tipoDoc} {f.cliente.nroDoc}
            </DatoComprobante>
          )}
          {f.cliente?.domicilio && <DatoComprobante etiqueta="Domicilio">{f.cliente.domicilio}</DatoComprobante>}
          <DatoComprobante etiqueta="Vendedor">{f.vendedor.nombre}</DatoComprobante>
        </Grilla>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {f.items.map((i) => (
              <TableRow key={i.productoId}>
                <TableCell className="whitespace-normal">
                  {i.descripcion}
                  <Texto variante="chico" className="font-mono">
                    {i.codigo}
                  </Texto>
                </TableCell>
                <TableCell className="text-right">
                  <Cifra>{i.cantidad}</Cifra>
                </TableCell>
                <TableCell className="text-right">
                  <Cifra>{moneda(i.precioUnitario)}</Cifra>
                </TableCell>
                <TableCell className="text-right">
                  <Cifra>{moneda(i.subtotal)}</Cifra>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-right text-base">
                Total
              </TableCell>
              <TableCell className="text-right text-base">
                <Cifra className="font-semibold">{moneda(f.total)}</Cifra>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <Separator />
        <Fila className="justify-between gap-6">
          <DatoComprobante etiqueta="Forma de pago">{etiquetaFormaPago[f.pago.forma]}</DatoComprobante>
          {f.pago.forma === "contado" && (
            <>
              <DatoComprobante etiqueta="Recibido">{moneda(f.pago.montoRecibido)}</DatoComprobante>
              <DatoComprobante etiqueta="Vuelto">{moneda(f.pago.vuelto)}</DatoComprobante>
            </>
          )}
          {f.pago.forma === "tarjeta" && (
            <DatoComprobante etiqueta="Tarjeta">
              {f.pago.tarjeta.tipo === "debito" ? "Débito" : "Crédito"} {f.pago.tarjeta.marca} ····{" "}
              {f.pago.tarjeta.ultimos4}
            </DatoComprobante>
          )}
          {"saldoCliente" in f && f.saldoCliente !== undefined && (
            <DatoComprobante etiqueta="Saldo actual del cliente">{moneda(f.saldoCliente)}</DatoComprobante>
          )}
        </Fila>
      </Comprobante>
    </Pila>
  );
}
