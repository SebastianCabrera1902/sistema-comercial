import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { EstadoVacio } from "@/components/comunes/estados";
import { Buscador, FiltroSelect, Paginador } from "@/components/comunes/filtros-url";
import { InsigniaActivo, InsigniaRol } from "@/components/comunes/insignias";
import { Fila, Pila, Texto } from "@/components/comunes/primitivas";
import { SinPermiso } from "@/components/comunes/sin-permiso";
import { AccionesUsuario, DialogoUsuario } from "@/components/usuarios/dialogo-usuario";
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
import { fecha } from "@/lib/formato";
import { parametros } from "@/lib/parametros";
import { esAdmin } from "@/server/permisos";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarUsuarios } from "@/server/servicios/usuarios";

export const metadata: Metadata = { title: "Usuarios" };

/** /usuarios — RF-U4. Solo administrador. */
export default async function PaginaUsuarios({ searchParams }: PageProps<"/usuarios">) {
  const usuario = await exigirUsuarioPagina();
  if (!esAdmin(usuario)) return <SinPermiso />;

  const { data, page, pageSize, total } = await listarUsuarios(
    usuario,
    await parametros(searchParams),
  );

  return (
    <Pila className="gap-6">
      <EncabezadoPagina titulo="Usuarios" descripcion="Personas que pueden ingresar al sistema y su rol.">
        <DialogoUsuario>
          <Button>Nuevo usuario</Button>
        </DialogoUsuario>
      </EncabezadoPagina>

      <Card>
        <CardContent>
          <Pila>
            <Fila>
              <Buscador placeholder="Buscar por nombre o email" />
              <FiltroSelect
                parametro="activo"
                todos="Activos e inactivos"
                opciones={[
                  { valor: "true", etiqueta: "Solo activos" },
                  { valor: "false", etiqueta: "Solo inactivos" },
                ]}
              />
            </Fila>
            {data.length === 0 ? (
              <EstadoVacio titulo="No hay usuarios que coincidan" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Alta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.nombre}
                        {u.id === usuario.id && <Texto variante="chico">Vos</Texto>}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <InsigniaRol rol={u.rol} />
                      </TableCell>
                      <TableCell>
                        <InsigniaActivo activo={u.activo} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{fecha(u.creadoEn)}</TableCell>
                      <TableCell className="text-right">
                        <AccionesUsuario usuario={u} esUnoMismo={u.id === usuario.id} />
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
