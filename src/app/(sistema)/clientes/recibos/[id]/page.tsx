import type { Metadata } from "next";
import { BotonImprimir } from "@/components/comprobantes/boton-imprimir";
import { Comprobante, DatoComprobante } from "@/components/comprobantes/comprobante";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Cifra, Grilla, Pila, Texto } from "@/components/comunes/primitivas";
import { Separator } from "@/components/ui/separator";
import { etiquetaMedioPago, fechaHora, moneda } from "@/lib/formato";
import { idDePagina, o404 } from "@/server/paginas";
import { exigirUsuarioPagina } from "@/server/sesion";
import { obtenerPago } from "@/server/servicios/pagos";

export const metadata: Metadata = { title: "Recibo" };

/** /clientes/recibos/[id] — RF-C5. Recibo numerado e imprimible. */
export default async function PaginaRecibo({ params }: PageProps<"/clientes/recibos/[id]">) {
  const usuario = await exigirUsuarioPagina();
  const recibo = await o404(obtenerPago(usuario, await idDePagina(params)));

  return (
    <Pila className="gap-6">
      <EncabezadoPagina
        titulo={`Recibo ${recibo.numeroRecibo}`}
        volver={{ href: `/clientes/${recibo.cliente.id}?tab=cuenta`, texto: recibo.cliente.nombre }}
      >
        <BotonImprimir />
      </EncabezadoPagina>

      <Comprobante tipo="Recibo de pago" numero={recibo.numeroRecibo} fechaHora={fechaHora(recibo.fecha)}>
        <Grilla columnas={2}>
          <DatoComprobante etiqueta="Recibimos de">{recibo.cliente.nombre}</DatoComprobante>
          <DatoComprobante etiqueta="Documento">
            {recibo.cliente.tipoDoc} {recibo.cliente.nroDoc}
          </DatoComprobante>
          <DatoComprobante etiqueta="Domicilio">{recibo.cliente.domicilio ?? "—"}</DatoComprobante>
          <DatoComprobante etiqueta="Atendió">{recibo.usuario.nombre}</DatoComprobante>
        </Grilla>
        <Separator />
        <Grilla columnas={2}>
          <DatoComprobante etiqueta="Medio de pago">{etiquetaMedioPago[recibo.medio]}</DatoComprobante>
          <DatoComprobante etiqueta="Concepto">Pago a cuenta corriente</DatoComprobante>
          {recibo.observacion && (
            <DatoComprobante etiqueta="Observación">{recibo.observacion}</DatoComprobante>
          )}
        </Grilla>
        <Separator />
        <Pila className="items-end gap-1">
          <Texto variante="chico">Importe recibido</Texto>
          <Cifra className="text-3xl font-semibold">{moneda(recibo.importe)}</Cifra>
          <Texto variante="suave">Saldo actual del cliente: {moneda(recibo.saldoCliente)}</Texto>
        </Pila>
      </Comprobante>
    </Pila>
  );
}
