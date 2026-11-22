"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StoreIcon } from "lucide-react";
import { CampoTexto } from "@/components/comunes/campos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { loginSchema } from "@/lib/esquemas";

export function FormularioLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { errores, enviando, manejarEnvio } = useFormulario(
    loginSchema,
    (datos) => api("/api/auth/login", { body: datos }),
    {
      alTerminar: () => {
        router.replace("/");
        router.refresh();
      },
    },
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
          <StoreIcon className="size-5" />
        </div>
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            manejarEnvio({ email, password });
          }}
        >
          <FieldGroup>
            <CampoTexto
              id="email"
              etiqueta="Email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errores.email}
            />
            <CampoTexto
              id="password"
              etiqueta="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errores.password}
            />
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
