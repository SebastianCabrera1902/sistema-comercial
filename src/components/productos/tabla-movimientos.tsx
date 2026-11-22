/** RF-P6. Tabla de movimientos de stock (fecha, tipo, cantidad, existencia, usuario, referencia). */
import Link from "next/link";
import { EstadoVacio } from "@/components/comunes/estados";
import { InsigniaTipo } from "@/components/comunes/insignias";
import { Cifra, Texto } from "@/components/comunes/primitivas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { etiquetaTipoMovimiento, fechaHora } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { MovimientoStockPublico } from "@/server/servicios/stock";

export function TablaMovimientos({
  movimientos,
  mostrarProducto = false,
}: {
  movimientos: MovimientoStockPublico[];
  mostrarProducto?: boolean;
}) {
  if (movimientos.length === 0) {
    return <EstadoVacio titulo="Sin movimientos" descripcion="Todavía no hay movimientos de stock." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          {mostrarProducto && <TableHead>Producto</TableHead>}
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Existencia</TableHead>
          <TableHead className="hidden md:table-cell">Motivo</TableHead>
          <TableHead className="hidden lg:table-cell">Usuario</TableHead>
          <TableHead>Referencia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movimientos.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="whitespace-nowrap">{fechaHora(m.fecha)}</TableCell>
            {mostrarProducto && (
              <TableCell>
                <Link href={`/productos/${m.producto.id}`} className="hover:underline">
                  {m.producto.descripcion}
                </Link>
                <Texto variante="chico" className="font-mono">
                  {m.producto.codigo}
                </Texto>
              </TableCell>
            )}
            <TableCell>
              <InsigniaTipo tipo={m.tipo} etiqueta={etiquetaTipoMovimiento[m.tipo]} />
            </TableCell>
            <TableCell className="text-right">
              <Cifra className={cn("font-medium", m.cantidad > 0 ? "text-success" : "text-destructive")}>
                {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
              </Cifra>
            </TableCell>
            <TableCell className="text-right">
              <Cifra>{m.existenciaResultante}</Cifra>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {m.motivo}
              {m.observacion && <Texto variante="chico">{m.observacion}</Texto>}
            </TableCell>
            <TableCell className="hidden lg:table-cell">{m.usuario.nombre}</TableCell>
            <TableCell>
              {m.referencia ? (
                <Link
                  href={`/ventas/${m.referencia.facturaId}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {m.referencia.numero}
                </Link>
              ) : (
                <Texto variante="chico">—</Texto>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
