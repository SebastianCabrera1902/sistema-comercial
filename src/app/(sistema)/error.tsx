"use client";

import { EstadoError } from "@/components/comunes/estados";
import { Button } from "@/components/ui/button";

export default function ErrorSistema({ reset }: { error: Error; reset: () => void }) {
  return (
    <EstadoError mensaje="No se pudo cargar esta pantalla. Probá de nuevo en unos segundos.">
      <Button variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </EstadoError>
  );
}
