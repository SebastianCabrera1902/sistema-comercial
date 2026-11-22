"use client";

/**
 * Confirmación de acciones irreversibles (sección 8): anular, dar de baja,
 * desactivar. Opcionalmente pide un motivo obligatorio.
 */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CampoAreaTexto } from "./campos";

export function Confirmar({
  children,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  destructivo = true,
  pedirMotivo = false,
  alConfirmar,
}: {
  children: React.ReactNode;
  titulo: string;
  descripcion: React.ReactNode;
  textoConfirmar?: string;
  destructivo?: boolean;
  pedirMotivo?: boolean;
  /** Devuelve true si salió bien (cierra el diálogo). */
  alConfirmar: (motivo: string) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function confirmar(e: React.MouseEvent) {
    e.preventDefault();
    if (pedirMotivo && motivo.trim().length < 3) {
      setError("El motivo es obligatorio.");
      return;
    }
    setEnviando(true);
    const ok = await alConfirmar(motivo.trim());
    setEnviando(false);
    if (ok) {
      setAbierto(false);
      setMotivo("");
      setError(undefined);
    }
  }

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        {pedirMotivo && (
          <CampoAreaTexto
            id="motivo-confirmacion"
            etiqueta="Motivo"
            value={motivo}
            error={error}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indicá el motivo"
            autoFocus
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={enviando}
            className={destructivo ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {enviando ? "Procesando…" : textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
