"use client";

import { useState } from "react";
import { CampoTexto } from "@/components/comunes/campos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { cambiarPasswordSchema } from "@/lib/esquemas";

export function FormularioPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");

  const { errores, enviando, manejarEnvio } = useFormulario(
    cambiarPasswordSchema,
    (datos) => api("/api/auth/password", { method: "PUT", body: datos }),
    {
      exito: "Contraseña actualizada.",
      alTerminar: () => {
        setActual("");
        setNueva("");
      },
    },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>La nueva contraseña debe tener al menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            manejarEnvio({ actual, nueva });
          }}
        >
          <FieldGroup>
            <CampoTexto
              id="actual"
              etiqueta="Contraseña actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              error={errores.actual}
            />
            <CampoTexto
              id="nueva"
              etiqueta="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              error={errores.nueva}
            />
            <Button type="submit" disabled={enviando} className="w-fit">
              {enviando ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
