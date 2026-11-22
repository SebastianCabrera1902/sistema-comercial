import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pila, Texto } from "./primitivas";

/** Se muestra cuando un vendedor entra a una pantalla de administrador. */
export function SinPermiso() {
  return (
    <Pila className="items-center gap-2 px-4 py-16 text-center">
      <ShieldAlertIcon className="size-10 text-muted-foreground" />
      <Texto variante="fuerte">No tenés permiso para ver esta pantalla</Texto>
      <Texto variante="suave">Es exclusiva del administrador.</Texto>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </Pila>
  );
}
