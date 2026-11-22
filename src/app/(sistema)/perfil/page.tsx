import type { Metadata } from "next";
import { FormularioPassword } from "@/components/auth/formulario-password";
import { EncabezadoPagina } from "@/components/comunes/encabezado-pagina";
import { InsigniaRol } from "@/components/comunes/insignias";
import { Fila, Pila, Texto } from "@/components/comunes/primitivas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { origenBaseDeDatos } from "@/db";
import { exigirUsuarioPagina } from "@/server/sesion";

export const metadata: Metadata = { title: "Mi perfil" };

/** /perfil — cada usuario cambia su contraseña (RF-U5). */
export default async function PaginaPerfil() {
  const usuario = await exigirUsuarioPagina();
  return (
    <Pila className="max-w-xl gap-6">
      <EncabezadoPagina titulo="Mi perfil" descripcion="Tus datos y tu contraseña." />
      <Card>
        <CardHeader>
          <CardTitle>{usuario.nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          <Fila className="justify-between">
            <Texto variante="suave">{usuario.email}</Texto>
            <InsigniaRol rol={usuario.rol} />
          </Fila>
        </CardContent>
      </Card>
      {usuario.rol === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Base de datos</CardTitle>
          </CardHeader>
          <CardContent>
            <Texto variante="mono">{origenBaseDeDatos}</Texto>
          </CardContent>
        </Card>
      )}
      <FormularioPassword />
    </Pila>
  );
}
