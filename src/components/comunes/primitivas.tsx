/**
 * Primitivas de maquetación (pautas 10.6). Las páginas se arman con estas
 * piezas y con componentes de shadcn/ui, sin etiquetas HTML sueltas.
 */
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"div">;

/** Apila elementos en vertical. */
export function Pila({ className, ...props }: Props) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

/** Alinea elementos en horizontal (y los pasa abajo si no entran). */
export function Fila({ className, ...props }: Props) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

/** Grilla adaptable: 1 columna en el teléfono, más en pantallas grandes. */
export function Grilla({
  className,
  columnas = 3,
  ...props
}: Props & { columnas?: 2 | 3 | 4 }) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 xl:grid-cols-4",
  }[columnas];
  return <div className={cn("grid grid-cols-1 gap-4", cols, className)} {...props} />;
}

const variantesTexto = {
  normal: "text-sm",
  suave: "text-sm text-muted-foreground",
  chico: "text-xs text-muted-foreground",
  fuerte: "text-sm font-medium",
  mono: "font-mono text-sm tabular-nums",
  error: "text-sm text-destructive",
} as const;

export function Texto({
  className,
  variante = "normal",
  ...props
}: React.ComponentProps<"p"> & { variante?: keyof typeof variantesTexto }) {
  return <p className={cn(variantesTexto[variante], className)} {...props} />;
}

export function Titulo({
  className,
  nivel = 1,
  ...props
}: React.ComponentProps<"h1"> & { nivel?: 1 | 2 | 3 }) {
  const Etiqueta = (["h1", "h2", "h3"] as const)[nivel - 1];
  const estilos = {
    1: "text-2xl font-semibold tracking-tight",
    2: "text-lg font-semibold tracking-tight",
    3: "text-base font-semibold",
  }[nivel];
  return <Etiqueta className={cn(estilos, className)} {...props} />;
}

/** Importe alineado a la derecha con números tabulares. */
export function Cifra({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("tabular-nums whitespace-nowrap", className)} {...props} />;
}
