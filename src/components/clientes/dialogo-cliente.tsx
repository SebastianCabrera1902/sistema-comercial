"use client";

/**
 * RF-C2. Alta o edición de cliente en una ventana modal.
 * El mismo formulario se usa para el alta rápida desde Nueva venta (RF-V2):
 * en ese caso `alCrear` recibe el cliente nuevo y la venta en curso no se pierde.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CampoCasilla,
  CampoImporte,
  CampoSelect,
  CampoTexto,
} from "@/components/comunes/campos";
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
import { clienteAltaSchema, clienteEdicionSchema } from "@/lib/esquemas";
import type { ClientePublico } from "@/server/servicios/clientes";

type Valores = {
  tipoDoc: "DNI" | "CUIT";
  nroDoc: string;
  nombre: string;
  domicilio: string;
  telefono: string;
  email: string;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
};

export function DialogoCliente({
  cliente,
  children,
  alCrear,
}: {
  cliente?: ClientePublico;
  children: React.ReactNode;
  alCrear?: (cliente: ClientePublico) => void;
}) {
  const router = useRouter();
  const edicion = !!cliente;
  const [abierto, setAbierto] = useState(false);

  const inicial: Valores = {
    tipoDoc: cliente?.tipoDoc ?? "DNI",
    nroDoc: cliente?.nroDoc ?? "",
    nombre: cliente?.nombre ?? "",
    domicilio: cliente?.domicilio ?? "",
    telefono: cliente?.telefono ?? "",
    email: cliente?.email ?? "",
    cuentaCorriente: cliente?.cuentaCorriente ?? false,
    limiteCredito: cliente?.limiteCredito ?? null,
  };
  const [v, setV] = useState<Valores>(inicial);
  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K]) =>
    setV((prev) => ({ ...prev, [campo]: valor }));

  const { errores, enviando, manejarEnvio, setErrores } = useFormulario(
    edicion ? clienteEdicionSchema : clienteAltaSchema,
    (datos) =>
      edicion
        ? api(`/api/clientes/${cliente.id}`, { method: "PATCH", body: datos })
        : api<ClientePublico>("/api/clientes", { body: datos }),
    {
      exito: edicion ? "Cliente actualizado." : "Cliente creado.",
      alTerminar: (resultado) => {
        setAbierto(false);
        if (!edicion) setV(inicial);
        if (alCrear) alCrear(resultado as ClientePublico);
        else router.refresh();
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{edicion ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            El documento identifica al cliente: no puede repetirse.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation(); // por si el diálogo se abre dentro de otro formulario
            manejarEnvio({
              ...v,
              domicilio: v.domicilio || null,
              telefono: v.telefono || null,
              email: v.email || null,
              limiteCredito: v.cuentaCorriente ? v.limiteCredito : null,
            });
          }}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <CampoSelect
                id="cl-tipo"
                etiqueta="Tipo de documento"
                valor={v.tipoDoc}
                alCambiar={(x) => cambiar("tipoDoc", x as "DNI" | "CUIT")}
                opciones={[
                  { valor: "DNI", etiqueta: "DNI" },
                  { valor: "CUIT", etiqueta: "CUIT" },
                ]}
                error={errores.tipoDoc}
              />
              <CampoTexto
                id="cl-doc"
                etiqueta="Número"
                inputMode="numeric"
                value={v.nroDoc}
                onChange={(e) => cambiar("nroDoc", e.target.value)}
                error={errores.nroDoc}
                autoFocus
              />
            </div>
            <CampoTexto
              id="cl-nombre"
              etiqueta="Nombre o razón social"
              value={v.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              error={errores.nombre}
            />
            <CampoTexto
              id="cl-domicilio"
              etiqueta="Domicilio"
              value={v.domicilio}
              onChange={(e) => cambiar("domicilio", e.target.value)}
              error={errores.domicilio}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                id="cl-telefono"
                etiqueta="Teléfono"
                value={v.telefono}
                onChange={(e) => cambiar("telefono", e.target.value)}
                error={errores.telefono}
              />
              <CampoTexto
                id="cl-email"
                etiqueta="Email"
                type="email"
                value={v.email}
                onChange={(e) => cambiar("email", e.target.value)}
                error={errores.email}
              />
            </div>
            <CampoCasilla
              id="cl-cc"
              etiqueta="Habilitado para cuenta corriente"
              ayuda="Permite venderle a cuenta y registrar pagos."
              valor={v.cuentaCorriente}
              alCambiar={(x) => cambiar("cuentaCorriente", x)}
            />
            {v.cuentaCorriente && (
              <CampoImporte
                id="cl-limite"
                etiqueta="Límite de crédito (opcional)"
                valor={v.limiteCredito}
                alCambiar={(c) => cambiar("limiteCredito", c)}
                error={errores.limiteCredito}
                ayuda="Vacío = sin límite."
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
