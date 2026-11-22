import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { Buscador, FiltroSelect, Paginador } from "@/components/comunes/filtros-url";
import { InsigniaActivo, InsigniaBajoMinimo } from "@/components/comunes/insignias";
import { Cifra, Fila, Pila } from "@/components/comunes/primitivas";
import { NAV_PRODUCTOS, SubNav } from "@/components/comunes/subnav";
import { DialogoProducto } from "@/components/productos/dialogo-producto";
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
import { esAdmin } from "@/server/permisos";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarCategorias } from "@/server/servicios/categorias";
import { listarProductos } from "@/server/servicios/productos";

export const metadata: Metadata = { title: "Catálogo" };

/** /productos — RF-P1. Catálogo con búsqueda, filtro por categoría y marca de bajo mínimo. */
export default async function PaginaProductos({ searchParams }: PageProps<"/productos">) {
  const usuario = await exigirUsuarioPagina();
  const admin = esAdmin(usuario);
  const [{ data, page, pageSize, total }, categorias] = await Promise.all([
    listarProductos(usuario, await parametros(searchParams)),
    listarCategorias(usuario),
  ]);

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Productos" descripcion="Catálogo, precios y existencias.">
        {admin && (
          <DialogoProducto categorias={categorias}>
            <Button>Nuevo producto</Button>
          </DialogoProducto>
        )}
      </EncabezadoPagina>
      <SubNav items={NAV_PRODUCTOS} />

      <Card>
        <CardContent>
          <Pila>
            <Fila>
              <Buscador placeholder="Buscar por código o descripción" />
              <FiltroSelect
                parametro="categoriaId"
                todos="Todas las categorías"
                opciones={categorias.map((c) => ({ valor: String(c.id), etiqueta: c.nombre }))}
              />
              <FiltroSelect
                parametro="bajoMinimo"
                todos="Cualquier existencia"
                opciones={[{ valor: "true", etiqueta: "Bajo el mínimo" }]}
              />
              {admin && (
                <FiltroSelect
                  parametro="activo"
                  todos="Solo activos"
                  opciones={[
                    { valor: "false", etiqueta: "Solo inactivos" },
                    { valor: "todos", etiqueta: "Activos e inactivos" },
                  ]}
                />
              )}
            </Fila>

            {data.length === 0 ? (
              <EstadoVacio
                titulo="No hay productos que coincidan"
                descripcion="Probá con otra búsqueda o cambiá los filtros."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="hidden md:table-cell">Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Existencia</TableHead>
                    {admin && <TableHead className="hidden lg:table-cell">Estado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.id} className={cn(!p.activo && "opacity-60")}>
                      <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                      <TableCell>
                        <Link href={`/productos/${p.id}`} className="font-medium hover:underline">
                          {p.descripcion}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{p.categoria.nombre}</TableCell>
                      <TableCell className="text-right">
                        <Cifra>{moneda(p.precio)}</Cifra>
                      </TableCell>
                      <TableCell className="text-right">
                        <Fila className="justify-end gap-2">
                          {p.bajoMinimo && <InsigniaBajoMinimo />}
                          <Cifra className={cn(p.bajoMinimo && "font-semibold text-amber-700")}>
                            {p.existencia}
                          </Cifra>
                        </Fila>
                      </TableCell>
                      {admin && (
                        <TableCell className="hidden lg:table-cell">
                          <InsigniaActivo activo={p.activo} />
                        </TableCell>
                      )}
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
