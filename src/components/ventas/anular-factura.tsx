"use client";

import { useRouter } from "next/navigation";
import { BanIcon } from "lucide-react";
import { toast } from "sonner";
import { Confirmar } from "@/components/comunes/confirmar";
import { Button } from "@/components/ui/button";
import { api, ErrorApi } from "@/lib/cliente-api";

/** RF-V9. Anular una factura (solo admin), con motivo obligatorio. */
export function AnularFactura({ facturaId, numero }: { facturaId: number; numero: string }) {
  const router = useRouter();
  return (
    <Confirmar
      titulo={`Anular la factura ${numero}`}
      descripcion="Se reingresa el stock de cada renglón y, si fue a cuenta corriente, se acredita el total al cliente. La factura queda visible como anulada."
      textoConfirmar="Anular factura"
      pedirMotivo
      alConfirmar={async (motivo) => {
        try {
          await api(`/api/facturas/${facturaId}/anulacion`, { body: { motivo } });
          toast.success(`Factura ${numero} anulada.`);
          router.refresh();
          return true;
        } catch (e) {
          toast.error(e instanceof ErrorApi ? e.message : "No se pudo anular.");
          return false;
        }
      }}
    >
      <Button variant="destructive">
        <BanIcon /> Anular
      </Button>
    </Confirmar>
  );
}
