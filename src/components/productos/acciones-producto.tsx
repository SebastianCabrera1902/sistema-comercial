"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PowerIcon } from "lucide-react";
import { toast } from "sonner";
import { CampoAreaTexto, CampoNumero, CampoSelect } from "@/components/comunes/campos";
import { Confirmar } from "@/components/comunes/confirmar";
import { Texto } from "@/components/comunes/primitivas";
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
import { api, ErrorApi } from "@/lib/cliente-api";
import { MOTIVOS_EGRESO, MOTIVOS_INGRESO, movimientoManualSchema } from "@/lib/esquemas";
import type { ProductoPublico } from "@/server/servicios/productos";
import { DialogoProducto } from "./dialogo-producto";

/** Acciones del administrador sobre un producto. */
export function AccionesProducto({
  producto,
  categorias,
}: {
  producto: ProductoPublico;
  categorias: { id: number; nombre: string }[];
}) {
  const router = useRouter();

  async function cambiarEstado() {
    try {
      await api(`/api/productos/${producto.id}`, {
        method: "PATCH",
        body: { activo: !producto.activo },
      });
      toast.success(producto.activo ? "Producto dado de baja." : "Producto reactivado.");
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof ErrorApi ? e.message : "No se pudo completar la operación.");
      return false;
    }
  }

  return (
    <>
      <DialogoMovimiento producto={producto} tipo="ingreso">
        <Button variant="outline">
          <ArrowUpIcon /> Ingreso
        </Button>
      </DialogoMovimiento>
      <DialogoMovimiento producto={producto} tipo="egreso">
        <Button variant="outline">
          <ArrowDownIcon /> Egreso
        </Button>
      </DialogoMovimiento>
      <DialogoProducto producto={producto} categorias={categorias}>
        <Button variant="outline">
          <PencilIcon /> Editar
        </Button>
      </DialogoProducto>
      <Confirmar
        titulo={producto.activo ? "Dar de baja el producto" : "Reactivar el producto"}
        descripcion={
          producto.activo
            ? "El producto deja de ofrecerse en las ventas pero conserva todo su historial."
            : "El producto vuelve a estar disponible para la venta."
        }
        textoConfirmar={producto.activo ? "Dar de baja" : "Reactivar"}
        destructivo={producto.activo}
        alConfirmar={cambiarEstado}
      >
        <Button variant={producto.activo ? "destructive" : "default"}>
          <PowerIcon /> {producto.activo ? "Dar de baja" : "Reactivar"}
        </Button>
      </Confirmar>
    </>
  );
}

/** RF-P4 / RF-P5. Ingreso o egreso manual de stock. */
function DialogoMovimiento({
  producto,
  tipo,
  children,
}: {
  producto: ProductoPublico;
  tipo: "ingreso" | "egreso";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState<number | undefined>();
  const [motivo, setMotivo] = useState<string>();
  const [observacion, setObservacion] = useState("");
  const motivos = tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;

  const { errores, enviando, manejarEnvio, setErrores } = useFormulario(
    movimientoManualSchema,
    (datos) => api(`/api/productos/${producto.id}/movimientos`, { body: datos }),
    {
      exito: tipo === "ingreso" ? "Ingreso registrado." : "Egreso registrado.",
      alTerminar: () => {
        setAbierto(false);
        setCantidad(undefined);
        setMotivo(undefined);
        setObservacion("");
        router.refresh();
      },
    },
  );

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
          <DialogTitle>{tipo === "ingreso" ? "Ingreso de stock" : "Egreso de stock"}</DialogTitle>
          <DialogDescription>
            {producto.descripcion} · existencia actual: {producto.existencia}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            manejarEnvio({ tipo, cantidad, motivo, observacion: observacion || null });
          }}
        >
          <FieldGroup>
            <CampoNumero
              id="m-cantidad"
              etiqueta="Cantidad"
              valor={cantidad}
              alCambiar={setCantidad}
              error={errores.cantidad}
              min={1}
              autoFocus
            />
            {tipo === "egreso" && cantidad !== undefined && cantidad > producto.existencia && (
              <Texto variante="error">
                Supera la existencia disponible ({producto.existencia}).
              </Texto>
            )}
            <CampoSelect
              id="m-motivo"
              etiqueta="Motivo"
              valor={motivo}
              alCambiar={setMotivo}
              opciones={motivos.map((m) => ({ valor: m, etiqueta: m }))}
              error={errores.motivo}
            />
            <CampoAreaTexto
              id="m-observacion"
              etiqueta="Observación (opcional)"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              error={errores.observacion}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Registrando…" : "Registrar"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
