"use client";

/**
 * Buscadores en vivo de la pantalla de venta. Consultan la API REST mientras
 * se escribe y se manejan con el teclado: flechas para moverse, Enter para
 * elegir y Escape para cerrar.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/cliente-api";
import { moneda } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { ClientePublico } from "@/server/servicios/clientes";
import type { ProductoPublico } from "@/server/servicios/productos";

type Paginado<T> = { data: T[] };

/** Hook genérico: busca en `url` con ?q= y espera 250 ms entre teclas. */
function useBusqueda<T>(url: string, texto: string) {
  const [resultados, setResultados] = useState<T[]>([]);
  const [buscando, setBuscando] = useState(false);
  const q = texto.trim();
  useEffect(() => {
    if (!q) return;
    let vigente = true;
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await api<Paginado<T>>(`${url}${url.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}&pageSize=8`);
        if (vigente) setResultados(r.data);
      } catch {
        if (vigente) setResultados([]);
      } finally {
        if (vigente) setBuscando(false);
      }
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [url, q]);
  return { resultados: q ? resultados : [], buscando };
}

export type BuscadorRef = { enfocar: () => void };

/** Busca productos por código o descripción. Enter agrega el resaltado. */
export const BuscadorProducto = forwardRef<
  BuscadorRef,
  { alElegir: (producto: ProductoPublico) => void }
>(function BuscadorProducto({ alElegir }, ref) {
  const input = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const { resultados, buscando } = useBusqueda<ProductoPublico>("/api/productos", texto);
  useImperativeHandle(ref, () => ({ enfocar: () => input.current?.focus() }));

  function elegir(p: ProductoPublico | undefined) {
    if (!p) return;
    alElegir(p);
    setTexto("");
    input.current?.focus();
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={input}
        autoFocus
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setIndice(0);
        }}
        placeholder="Código o descripción del producto (F2)"
        className="pl-8"
        aria-label="Buscar producto"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndice((i) => Math.min(i + 1, resultados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndice((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            // Si el texto coincide exactamente con un código, se toma ese.
            const exacto = resultados.find((p) => p.codigo.toLowerCase() === texto.trim().toLowerCase());
            elegir(exacto ?? resultados[indice]);
          } else if (e.key === "Escape") {
            setTexto("");
          }
        }}
      />
      {texto.trim() && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {buscando ? "Buscando…" : "No se encontraron productos."}
            </p>
          ) : (
            resultados.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(p)}
                onMouseEnter={() => setIndice(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                  i === indice && "bg-accent",
                )}
              >
                <span className="min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>{" "}
                  <span className="font-medium">{p.descripcion}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {moneda(p.precio)}
                  <span
                    className={cn(
                      "block text-xs",
                      p.existencia === 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {p.existencia === 0 ? "Sin stock" : `Disponible: ${p.existencia}`}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});

/** Busca clientes registrados por nombre o documento. */
export const BuscadorCliente = forwardRef<
  BuscadorRef,
  { alElegir: (cliente: ClientePublico) => void }
>(function BuscadorCliente({ alElegir }, ref) {
  const input = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const { resultados, buscando } = useBusqueda<ClientePublico>("/api/clientes", texto);
  useImperativeHandle(ref, () => ({ enfocar: () => input.current?.focus() }));

  function elegir(c: ClientePublico | undefined) {
    if (!c) return;
    alElegir(c);
    setTexto("");
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={input}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setIndice(0);
        }}
        placeholder="Buscar cliente por nombre o documento (F4)"
        className="pl-8"
        aria-label="Buscar cliente"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndice((i) => Math.min(i + 1, resultados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndice((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            elegir(resultados[indice]);
          } else if (e.key === "Escape") {
            setTexto("");
          }
        }}
      />
      {texto.trim() && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {buscando ? "Buscando…" : "No se encontraron clientes."}
            </p>
          ) : (
            resultados.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(c)}
                onMouseEnter={() => setIndice(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                  i === indice && "bg-accent",
                )}
              >
                <span>
                  <span className="font-medium">{c.nombre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.tipoDoc} {c.nroDoc}
                  </span>
                </span>
                {c.cuentaCorriente && (
                  <span className="text-xs text-muted-foreground">Cta. cte. · saldo {moneda(c.saldo)}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});
