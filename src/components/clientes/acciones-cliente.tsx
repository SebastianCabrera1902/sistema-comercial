"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BanknoteIcon, PencilIcon, PowerIcon } from "lucide-react";
import { toast } from "sonner";
import { CampoAreaTexto, CampoImporte, CampoSelect } from "@/components/comunes/campos";
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
import { pagoSchema } from "@/lib/esquemas";
import { etiquetaMedioPago, moneda } from "@/lib/formato";
import type { ClientePublico } from "@/server/servicios/clientes";
import { DialogoCliente } from "./dialogo-cliente";

export function AccionesCliente({ cliente }: { cliente: ClientePublico }) {
  const router = useRouter();
  return (
    <>
      {cliente.cuentaCorriente && cliente.activo && cliente.saldo > 0 && (
        <DialogoPago cliente={cliente}>
          <Button>
            <BanknoteIcon /> Registrar pago
          </Button>
        </DialogoPago>
      )}
      <DialogoCliente cliente={cliente}>
        <Button variant="outline">
          <PencilIcon /> Editar
        </Button>
      </DialogoCliente>
      <Confirmar
        titulo={cliente.activo ? "Dar de baja el cliente" : "Reactivar el cliente"}
        descripcion={
          cliente.activo
            ? "El cliente deja de aparecer en los listados y en las ventas, pero conserva su historial. Solo se puede si no tiene saldo."
            : "El cliente vuelve a estar disponible."
        }
        textoConfirmar={cliente.activo ? "Dar de baja" : "Reactivar"}
        destructivo={cliente.activo}
        alConfirmar={async () => {
          try {
            await api(`/api/clientes/${cliente.id}`, {
              method: "PATCH",
              body: { activo: !cliente.activo },
            });
            toast.success(cliente.activo ? "Cliente dado de baja." : "Cliente reactivado.");
            router.refresh();
            return true;
          } catch (e) {
            toast.error(e instanceof ErrorApi ? e.message : "No se pudo completar la operación.");
            return false;
          }
        }}
      >
        <Button variant={cliente.activo ? "destructive" : "default"}>
          <PowerIcon /> {cliente.activo ? "Dar de baja" : "Reactivar"}
        </Button>
      </Confirmar>
    </>
  );
}

/** RF-C5. Registrar un pago a cuenta. Al terminar abre el recibo imprimible. */
export function DialogoPago({
  cliente,
  children,
}: {
  cliente: ClientePublico;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [importe, setImporte] = useState<number | null>(null);
  const [medio, setMedio] = useState<string>("efectivo");
  const [observacion, setObservacion] = useState("");

  const { errores, enviando, manejarEnvio, setErrores } = useFormulario(
    pagoSchema,
    (datos) => api<{ id: number }>(`/api/clientes/${cliente.id}/pagos`, { body: datos }),
    {
      exito: "Pago registrado.",
      alTerminar: (r) => {
        setAbierto(false);
        router.push(`/clientes/recibos/${(r as { id: number }).id}`);
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
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {cliente.nombre} · deuda actual: {moneda(cliente.saldo)}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            manejarEnvio({ importe, medio, observacion: observacion || null });
          }}
        >
          <FieldGroup>
            <CampoImporte
              id="pg-importe"
              etiqueta="Importe"
              valor={importe}
              alCambiar={setImporte}
              error={errores.importe}
              autoFocus
            />
            {importe !== null && importe > cliente.saldo && (
              <Texto variante="error">El pago no puede superar la deuda.</Texto>
            )}
            <Button
              type="button"
              variant="link"
              className="h-auto w-fit p-0"
              onClick={() => setImporte(cliente.saldo)}
            >
              Cancelar el total ({moneda(cliente.saldo)})
            </Button>
            <CampoSelect
              id="pg-medio"
              etiqueta="Medio de pago"
              valor={medio}
              alCambiar={setMedio}
              opciones={Object.entries(etiquetaMedioPago).map(([valor, etiqueta]) => ({
                valor,
                etiqueta,
              }))}
              error={errores.medio}
            />
            <CampoAreaTexto
              id="pg-obs"
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
                {enviando ? "Registrando…" : "Registrar pago"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
