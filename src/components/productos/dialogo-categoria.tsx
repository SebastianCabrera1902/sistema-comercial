"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { CampoTexto } from "@/components/comunes/campos";
import { Confirmar } from "@/components/comunes/confirmar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { useFormulario } from "@/hooks/use-formulario";
import { api, ErrorApi } from "@/lib/cliente-api";
import { categoriaAltaSchema } from "@/lib/esquemas";

type Categoria = { id: number; nombre: string; activa: boolean };

/** RF-P7. Alta o cambio de nombre de una categoría. */
export function DialogoCategoria({
  categoria,
  children,
}: {
  categoria?: Categoria;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");

  const { errores, enviando, manejarEnvio, setErrores } = useFormulario(
    categoriaAltaSchema,
    (datos) =>
      categoria
        ? api(`/api/categorias/${categoria.id}`, { method: "PATCH", body: datos })
        : api("/api/categorias", { body: datos }),
    {
      exito: categoria ? "Categoría actualizada." : "Categoría creada.",
      alTerminar: () => {
        setAbierto(false);
        if (!categoria) setNombre("");
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            manejarEnvio({ nombre });
          }}
        >
          <FieldGroup>
            <CampoTexto
              id="c-nombre"
              etiqueta="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              error={errores.nombre}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                Guardar
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccionesCategoria({ categoria }: { categoria: Categoria }) {
  const router = useRouter();
  return (
    <div className="flex justify-end gap-1">
      <DialogoCategoria categoria={categoria}>
        <Button variant="ghost" size="icon" aria-label="Editar">
          <PencilIcon />
        </Button>
      </DialogoCategoria>
      <Confirmar
        titulo={categoria.activa ? "Desactivar categoría" : "Reactivar categoría"}
        descripcion={
          categoria.activa
            ? "Solo se puede desactivar si no tiene productos activos."
            : "La categoría vuelve a estar disponible."
        }
        textoConfirmar={categoria.activa ? "Desactivar" : "Reactivar"}
        destructivo={categoria.activa}
        alConfirmar={async () => {
          try {
            await api(`/api/categorias/${categoria.id}`, {
              method: "PATCH",
              body: { activa: !categoria.activa },
            });
            toast.success(categoria.activa ? "Categoría desactivada." : "Categoría reactivada.");
            router.refresh();
            return true;
          } catch (e) {
            toast.error(e instanceof ErrorApi ? e.message : "No se pudo completar la operación.");
            return false;
          }
        }}
      >
        <Button variant="ghost" size="sm">
          {categoria.activa ? "Desactivar" : "Reactivar"}
        </Button>
      </Confirmar>
    </div>
  );
}
