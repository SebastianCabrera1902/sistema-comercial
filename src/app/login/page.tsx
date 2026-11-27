import type { Metadata } from "next";
import { StoreIcon } from "lucide-react";
import { FormularioLogin } from "@/components/auth/formulario-login";

export const metadata: Metadata = { title: "Iniciar sesión" };

/** /login — única página pública (RF-U1). */
export default function PaginaLogin() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <StoreIcon className="size-5" />
          </span>
          Mostrador
        </div>
        <div className="max-w-md space-y-3">
          <p className="text-3xl leading-tight font-semibold">
            Ventas, stock y cuentas corrientes en un solo lugar.
          </p>
          <p className="text-sidebar-foreground/70">
            Facturá en el mostrador, controlá las existencias y llevá el saldo de cada cliente sin
            planillas sueltas.
          </p>
        </div>
        <p className="text-sm text-sidebar-foreground/50">Programación IV · TUP 2026</p>
      </section>
      <section className="flex flex-col p-6">
        <div className="self-end text-right text-xs leading-snug text-muted-foreground">
          <div className="text-sm font-semibold text-foreground">Grupo 15</div>
          <div>Juan Ignacio Andina · 63392</div>
          <div>Máximo Isaías Romano · 64052</div>
          <div>Fernando Sebastián Cabrera · 54652</div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <FormularioLogin />
        </div>
      </section>
    </main>
  );
}