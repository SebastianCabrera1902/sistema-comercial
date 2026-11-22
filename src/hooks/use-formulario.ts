"use client";

/**
 * Hook común de formularios (pautas 10.6).
 *
 * - Valida primero con el MISMO esquema de Zod que usa el servidor, para
 *   mostrar los errores junto a cada campo antes de enviar.
 * - Si el servidor rechaza, muestra sus errores por campo (details) o un aviso.
 * - Maneja el estado de envío y avisa el resultado con un toast.
 */
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { ErrorApi } from "@/lib/cliente-api";

type Errores = Record<string, string>;

export function useFormulario<T extends z.ZodType>(
  esquema: T,
  enviar: (datos: z.infer<T>) => Promise<unknown>,
  opciones: { exito?: string; alTerminar?: (resultado: unknown) => void } = {},
) {
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(valores: unknown) {
    const resultado = esquema.safeParse(valores);
    if (!resultado.success) {
      const nuevos: Errores = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path.join(".") || "general";
        nuevos[campo] ??= issue.message;
      }
      setErrores(nuevos);
      return;
    }

    setErrores({});
    setEnviando(true);
    try {
      const respuesta = await enviar(resultado.data);
      if (opciones.exito) toast.success(opciones.exito);
      opciones.alTerminar?.(respuesta);
    } catch (e) {
      if (e instanceof ErrorApi) {
        const porCampo: Errores = {};
        for (const d of e.details ?? []) {
          if (d.campo && d.mensaje) porCampo[d.campo] = d.mensaje;
        }
        setErrores(porCampo);
        toast.error(e.message);
      } else {
        toast.error("No se pudo completar la operación.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return { errores, enviando, manejarEnvio, setErrores };
}
