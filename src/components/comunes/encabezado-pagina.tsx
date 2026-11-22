import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { Fila, Pila, Titulo } from "./primitivas";

/** Encabezado común de todas las páginas: título, descripción y acciones. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  volver,
  children,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  volver?: { href: string; texto: string };
  children?: React.ReactNode;
}) {
  return (
    <Pila className="gap-1">
      {volver && (
        <Link
          href={volver.href}
          className="no-print inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          {volver.texto}
        </Link>
      )}
      <Fila className="justify-between gap-3">
        <Pila className="gap-1">
          <Titulo>{titulo}</Titulo>
          {/* div y no <p>: la descripción puede traer otros bloques (insignias, filas) */}
          {descripcion && <div className="text-sm text-muted-foreground">{descripcion}</div>}
        </Pila>
        {children && <Fila className="no-print">{children}</Fila>}
      </Fila>
    </Pila>
  );
}
