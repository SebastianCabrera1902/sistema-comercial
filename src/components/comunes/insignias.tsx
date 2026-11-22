/** Insignias de estado que se repiten en varias pantallas. */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InsigniaActivo({ activo, femenino = false }: { activo: boolean; femenino?: boolean }) {
  return activo ? (
    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
      {femenino ? "Activa" : "Activo"}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {femenino ? "Inactiva" : "Inactivo"}
    </Badge>
  );
}

export function InsigniaBajoMinimo() {
  return (
    <Badge variant="outline" className="border-warning/50 bg-warning/15 text-amber-800">
      Bajo mínimo
    </Badge>
  );
}

export function InsigniaEstadoFactura({ estado }: { estado: "emitida" | "anulada" }) {
  return estado === "emitida" ? (
    <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
      Emitida
    </Badge>
  ) : (
    <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
      Anulada
    </Badge>
  );
}

export function InsigniaRol({ rol }: { rol: "admin" | "vendedor" }) {
  return (
    <Badge variant={rol === "admin" ? "default" : "secondary"}>
      {rol === "admin" ? "Administrador" : "Vendedor"}
    </Badge>
  );
}

const coloresMovimiento: Record<string, string> = {
  venta: "border-chart-1/40 bg-chart-1/10 text-chart-1",
  anulacion: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  ingreso: "border-success/40 bg-success/10 text-success",
  egreso: "border-destructive/40 bg-destructive/10 text-destructive",
  debito: "border-destructive/40 bg-destructive/10 text-destructive",
  credito: "border-success/40 bg-success/10 text-success",
};

export function InsigniaTipo({ tipo, etiqueta }: { tipo: string; etiqueta: string }) {
  return (
    <Badge variant="outline" className={cn(coloresMovimiento[tipo])}>
      {etiqueta}
    </Badge>
  );
}
