/**
 * Estructura común de los comprobantes imprimibles (factura y recibo).
 * Al imprimir, el panel lateral y los botones se ocultan (ver globals.css).
 */
import { StoreIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { COMERCIO } from "@/lib/comercio";
import { cn } from "@/lib/utils";
import { Pila, Texto } from "../comunes/primitivas";

export function Comprobante({
  tipo,
  numero,
  fechaHora,
  anulado,
  children,
}: {
  tipo: string;
  numero: string;
  fechaHora: string;
  anulado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("comprobante relative mx-auto w-full max-w-3xl overflow-hidden")}>
      {anulado && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded-lg border-4 border-destructive/50 px-6 py-2 text-5xl font-bold tracking-widest text-destructive/40">
            ANULADA
          </span>
        </div>
      )}
      <CardContent className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <StoreIcon className="size-5" />
            </span>
            <Pila className="gap-0.5">
              <Texto variante="fuerte" className="text-base">
                {COMERCIO.nombre}
              </Texto>
              <Texto variante="chico">{COMERCIO.razonSocial}</Texto>
              <Texto variante="chico">CUIT {COMERCIO.cuit}</Texto>
              <Texto variante="chico">{COMERCIO.domicilio}</Texto>
              <Texto variante="chico">Tel. {COMERCIO.telefono}</Texto>
            </Pila>
          </div>
          <Pila className="gap-0.5 sm:text-right">
            <Texto variante="chico" className="tracking-wide uppercase">
              {tipo}
            </Texto>
            <Texto className="font-mono text-lg font-semibold">{numero}</Texto>
            <Texto variante="suave">{fechaHora}</Texto>
            <Texto variante="chico">Comprobante interno · sin validez fiscal</Texto>
          </Pila>
        </div>
        <Separator />
        {children}
      </CardContent>
    </Card>
  );
}

/** Par etiqueta / valor dentro de un comprobante. */
export function DatoComprobante({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <Pila className="gap-0.5">
      <Texto variante="chico">{etiqueta}</Texto>
      <Texto>{children}</Texto>
    </Pila>
  );
}
