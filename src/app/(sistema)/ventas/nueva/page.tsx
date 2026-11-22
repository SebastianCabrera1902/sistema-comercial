import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Pila } from "@/components/comunes/primitivas";
import { NuevaVenta } from "@/components/ventas/nueva-venta";
import { exigirUsuarioPagina } from "@/server/sesion";
import { proximoNumeroInformativo } from "@/server/servicios/facturas";

export const metadata: Metadata = { title: "Nueva venta" };

/** /ventas/nueva — RF-V1. Una sola pantalla: comprador, ítems y forma de pago. */
export default async function PaginaNuevaVenta() {
  const usuario = await exigirUsuarioPagina();
  const { numeroFormateado } = await proximoNumeroInformativo(usuario);
  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Nueva venta" descripcion="Armá la venta y emití la factura." />
      <NuevaVenta proximoNumero={numeroFormateado} />
    </Pila>
  );
}
