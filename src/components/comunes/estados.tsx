/**
 * Estados de los listados (sección 8): cargando, vacío y error.
 * Se resuelven una sola vez acá y se reutilizan en todas las pantallas.
 */
import { AlertTriangleIcon, InboxIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pila, Texto } from "./primitivas";

export function EstadoVacio({
  titulo = "No hay datos para mostrar",
  descripcion,
  children,
}: {
  titulo?: string;
  descripcion?: string;
  children?: React.ReactNode;
}) {
  return (
    <Pila className="items-center gap-2 px-4 py-12 text-center">
      <InboxIcon className="size-10 text-muted-foreground/60" />
      <Texto variante="fuerte">{titulo}</Texto>
      {descripcion && <Texto variante="suave">{descripcion}</Texto>}
      {children}
    </Pila>
  );
}

export function EstadoError({
  mensaje = "No se pudieron cargar los datos.",
  children,
}: {
  mensaje?: string;
  children?: React.ReactNode;
}) {
  return (
    <Pila className="items-center gap-2 px-4 py-12 text-center">
      <AlertTriangleIcon className="size-10 text-destructive/70" />
      <Texto variante="fuerte">Algo salió mal</Texto>
      <Texto variante="suave">{mensaje}</Texto>
      {children}
    </Pila>
  );
}

/** Esqueleto que se muestra mientras carga un listado. */
export function CargandoListado({ filas = 8 }: { filas?: number }) {
  return (
    <Pila className="gap-6">
      <Pila className="gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </Pila>
      <Card>
        <CardContent>
          <Pila className="gap-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            {Array.from({ length: filas }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}
