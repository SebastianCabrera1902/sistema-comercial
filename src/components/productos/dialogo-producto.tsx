"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampoImporte, CampoNumero, CampoSelect, CampoTexto } from "@/components/comunes/campos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { productoAltaSchema, productoEdicionSchema } from "@/lib/esquemas";
import type { ProductoPublico } from "@/server/servicios/productos";

type Categoria = { id: number; nombre: string };

/** RF-P2. Alta o edición de producto. La existencia nunca se edita a mano. */
export function DialogoProducto({
  producto,
  categorias,
  children,
}: {
  producto?: ProductoPublico;
  categorias: Categoria[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const edicion = !!producto;
  const [abierto, setAbierto] = useState(false);

  const inicial = {
    codigo: producto?.codigo ?? "",
    descripcion: producto?.descripcion ?? "",
    categoriaId: producto?.categoria.id,
    precio: producto?.precio ?? null,
    stockMinimo: producto?.stockMinimo ?? 0,
    stockInicial: undefined as number | undefined,
  };
  const [v, setV] = useState(inicial);
  const cambiar = <K extends keyof typeof v>(campo: K, valor: (typeof v)[K]) =>
    setV((prev) => ({ ...prev, [campo]: valor }));

  const { errores, enviando, manejarEnvio, setErrores } = useFormulario(
    edicion ? productoEdicionSchema : productoAltaSchema,
    (datos) =>
      edicion
        ? api(`/api/productos/${producto.id}`, { method: "PATCH", body: datos })
        : api("/api/productos", { body: datos }),
    {
      exito: edicion ? "Producto actualizado." : "Producto creado.",
      alTerminar: () => {
        setAbierto(false);
        if (!edicion) setV(inicial);
        router.refresh();
      },
    },
  );

  // Si la categoría actual está inactiva, se agrega para que el select la muestre.
  const opciones = categorias.map((c) => ({ valor: String(c.id), etiqueta: c.nombre }));
  if (producto && !categorias.some((c) => c.id === producto.categoria.id)) {
    opciones.push({ valor: String(producto.categoria.id), etiqueta: producto.categoria.nombre });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(a) => {
        setAbierto(a);
        if (!a) setErrores({});
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edicion ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {edicion
              ? "La existencia no se edita: se modifica con ingresos y egresos de stock."
              : "El stock inicial se registra como un ingreso con motivo «Stock inicial»."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const { stockInicial, ...resto } = v;
            manejarEnvio(
              edicion
                ? resto
                : { ...resto, ...(stockInicial !== undefined && { stockInicial }) },
            );
          }}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <CampoTexto
                id="p-codigo"
                etiqueta="Código"
                value={v.codigo}
                onChange={(e) => cambiar("codigo", e.target.value)}
                error={errores.codigo}
                className="uppercase"
              />
              <CampoTexto
                id="p-descripcion"
                etiqueta="Descripción"
                value={v.descripcion}
                onChange={(e) => cambiar("descripcion", e.target.value)}
                error={errores.descripcion}
              />
            </div>
            <CampoSelect
              id="p-categoria"
              etiqueta="Categoría"
              valor={v.categoriaId ? String(v.categoriaId) : undefined}
              alCambiar={(x) => cambiar("categoriaId", Number(x))}
              opciones={opciones}
              error={errores.categoriaId}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoImporte
                id="p-precio"
                etiqueta="Precio de venta"
                valor={v.precio}
                alCambiar={(c) => cambiar("precio", c)}
                error={errores.precio}
                ayuda="Precio final, con impuestos."
              />
              <CampoNumero
                id="p-minimo"
                etiqueta="Stock mínimo"
                valor={v.stockMinimo}
                alCambiar={(n) => cambiar("stockMinimo", n ?? 0)}
                error={errores.stockMinimo}
                min={0}
              />
            </div>
            {!edicion && (
              <CampoNumero
                id="p-inicial"
                etiqueta="Stock inicial (opcional)"
                valor={v.stockInicial}
                alCambiar={(n) => cambiar("stockInicial", n)}
                error={errores.stockInicial}
                min={0}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
