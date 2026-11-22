import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { InsigniaActivo } from "@/components/comunes/insignias";
import { Cifra, Pila } from "@/components/comunes/primitivas";
import { NAV_PRODUCTOS, SubNav } from "@/components/comunes/subnav";
import { AccionesCategoria, DialogoCategoria } from "@/components/productos/dialogo-categoria";
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
import { esAdmin } from "@/server/permisos";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarCategorias } from "@/server/servicios/categorias";

export const metadata: Metadata = { title: "Categorías" };

/** /productos/categorias — RF-P7. */
export default async function PaginaCategorias() {
  const usuario = await exigirUsuarioPagina();
  const admin = esAdmin(usuario);
  const categorias = await listarCategorias(usuario, true);

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Productos" descripcion="Categorías del catálogo.">
        {admin && (
          <DialogoCategoria>
            <Button>Nueva categoría</Button>
          </DialogoCategoria>
        )}
      </EncabezadoPagina>
      <SubNav items={NAV_PRODUCTOS} />
      <Card>
        <CardContent>
          {categorias.length === 0 ? (
            <EstadoVacio titulo="Todavía no hay categorías" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Productos activos</TableHead>
                  <TableHead>Estado</TableHead>
                  {admin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-right">
                      <Cifra>{c.productos}</Cifra>
                    </TableCell>
                    <TableCell>
                      <InsigniaActivo activo={c.activa} femenino />
                    </TableCell>
                    {admin && (
                      <TableCell className="text-right">
                        <AccionesCategoria categoria={c} />
                      </TableCell>
                    )}
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
