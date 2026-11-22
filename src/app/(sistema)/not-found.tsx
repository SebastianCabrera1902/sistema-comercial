import Link from "next/link";
import { EstadoVacio } from "@/components/comunes/estados";
import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <EstadoVacio titulo="No encontramos lo que buscás" descripcion="El registro no existe o fue dado de baja.">
      <Button asChild variant="outline">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </EstadoVacio>
  );
}
