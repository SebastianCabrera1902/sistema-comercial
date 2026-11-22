import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { Paginador } from "@/components/comunes/filtros-url";
import { InsigniaActivo, InsigniaBajoMinimo } from "@/components/comunes/insignias";
import { Cifra, Fila, Grilla, Pila, Texto } from "@/components/comunes/primitivas";
import { AccionesProducto } from "@/components/productos/acciones-producto";
import { TablaMovimientos } from "@/components/productos/tabla-movimientos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { moneda } from "@/lib/formato";
import { parametros } from "@/lib/parametros";
import { idDePagina, o404 } from "@/server/paginas";
import { esAdmin } from "@/server/permisos";
import { exigirUsuarioPagina } from "@/server/sesion";
import { listarCategorias } from "@/server/servicios/categorias";
import { obtenerProducto } from "@/server/servicios/productos";
import { listarMovimientos } from "@/server/servicios/stock";

/** /productos/[id] — Ficha del producto con sus movimientos (RF-P6). */
export default async function PaginaProducto({ params, searchParams }: PageProps<"/productos/[id]">) {
  const usuario = await exigirUsuarioPagina();
  const id = await idDePagina(params);
  const sp = await parametros(searchParams);

  const [producto, movimientos, categorias] = await Promise.all([
    o404(obtenerProducto(usuario, id)),
    listarMovimientos(usuario, { ...sp, productoId: String(id) }),
    listarCategorias(usuario),
  ]);

  return (
    <Pila className="gap-6">
      <EncabezadoPagina
        titulo={producto.descripcion}
        descripcion={
          <Fila>
            <Texto variante="mono">{producto.codigo}</Texto>
            <Texto variante="suave">· {producto.categoria.nombre}</Texto>
          </Fila>
        }
        volver={{ href: "/productos", texto: "Catálogo" }}
      >
        {esAdmin(usuario) && <AccionesProducto producto={producto} categorias={categorias} />}
      </EncabezadoPagina>

      <Grilla columnas={4}>
        <Card>
          <CardHeader>
            <CardDescription>Precio de venta</CardDescription>
            <CardTitle className="text-2xl">
              <Cifra>{moneda(producto.precio)}</Cifra>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Existencia</CardDescription>
            <CardTitle className="text-2xl">
              <Fila>
                <Cifra>{producto.existencia}</Cifra>
                {producto.bajoMinimo && <InsigniaBajoMinimo />}
              </Fila>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Stock mínimo</CardDescription>
            <CardTitle className="text-2xl">
              <Cifra>{producto.stockMinimo}</Cifra>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Estado</CardDescription>
            <CardTitle>
              <InsigniaActivo activo={producto.activo} />
            </CardTitle>
          </CardHeader>
        </Card>
      </Grilla>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de stock</CardTitle>
          <CardDescription>
            Cada venta, anulación, ingreso o egreso queda registrado con la existencia resultante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TablaMovimientos movimientos={movimientos.data} />
          <Paginador page={movimientos.page} pageSize={movimientos.pageSize} total={movimientos.total} />
        </CardContent>
      </Card>
    </Pila>
  );
}
