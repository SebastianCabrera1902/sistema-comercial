"use client";

/** Pestañas de navegación dentro de un módulo (p. ej. Catálogo · Existencias · Categorías). */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SubNav({ items }: { items: { href: string; titulo: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="no-print flex gap-1 overflow-x-auto border-b">
      {items.map((i) => {
        const activo = pathname === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              activo
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {i.titulo}
          </Link>
        );
      })}
    </nav>
  );
}

export const NAV_PRODUCTOS = [
  { href: "/productos", titulo: "Catálogo" },
  { href: "/productos/movimientos", titulo: "Existencias y movimientos" },
  { href: "/productos/categorias", titulo: "Categorías" },
];

export const NAV_CLIENTES = [
  { href: "/clientes", titulo: "Clientes" },
  { href: "/clientes/saldos", titulo: "Saldos" },
];
