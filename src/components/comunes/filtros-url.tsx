"use client";

/**
 * Búsqueda, filtros y paginado viven en la URL (pautas 10.6): así un listado
 * se puede recargar o compartir y sigue mostrando lo mismo.
 */
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Devuelve una función que cambia parámetros de la URL (y vuelve a la página 1). */
function useCambiarParametros() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();

  function cambiar(cambios: Record<string, string | null>, reiniciarPagina = true) {
    const nuevos = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === "") nuevos.delete(clave);
      else nuevos.set(clave, valor);
    }
    if (reiniciarPagina) nuevos.delete("page");
    const qs = nuevos.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }
  return { cambiar, params, pendiente };
}

/** Campo de búsqueda en vivo: actualiza ?q= mientras se escribe. */
export function Buscador({
  placeholder = "Buscar…",
  parametro = "q",
  className,
}: {
  placeholder?: string;
  parametro?: string;
  className?: string;
}) {
  const { cambiar, params } = useCambiarParametros();
  const [valor, setValor] = useState(params.get(parametro) ?? "");

  useEffect(() => {
    const actual = params.get(parametro) ?? "";
    if (valor === actual) return;
    const t = setTimeout(() => cambiar({ [parametro]: valor }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

/** Selector que filtra el listado por un parámetro de la URL. */
export function FiltroSelect({
  parametro,
  opciones,
  todos = "Todos",
  className,
}: {
  parametro: string;
  opciones: { valor: string; etiqueta: string }[];
  todos?: string;
  className?: string;
}) {
  const { cambiar, params } = useCambiarParametros();
  return (
    <Select
      value={params.get(parametro) ?? "__todos"}
      onValueChange={(v) => cambiar({ [parametro]: v === "__todos" ? null : v })}
    >
      <SelectTrigger className={cn("w-full sm:w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__todos">{todos}</SelectItem>
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Filtro de fecha (AAAA-MM-DD) guardado en la URL. */
export function FiltroFecha({ parametro, etiqueta }: { parametro: string; etiqueta: string }) {
  const { cambiar, params } = useCambiarParametros();
  return (
    <Input
      type="date"
      aria-label={etiqueta}
      title={etiqueta}
      value={params.get(parametro) ?? ""}
      onChange={(e) => cambiar({ [parametro]: e.target.value })}
      className="w-full sm:w-40"
    />
  );
}

/** Paginador común de todos los listados. */
export function Paginador({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const { cambiar, pendiente } = useCambiarParametros();
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
      <span>
        {total === 0 ? "Sin resultados" : `${desde}–${hasta} de ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || pendiente}
          onClick={() => cambiar({ page: String(page - 1) }, false)}
        >
          <ChevronLeftIcon /> Anterior
        </Button>
        <span className="tabular-nums">
          {page} / {paginas}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= paginas || pendiente}
          onClick={() => cambiar({ page: String(page + 1) }, false)}
        >
          Siguiente <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
