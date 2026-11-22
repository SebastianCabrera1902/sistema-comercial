"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon, MoreHorizontalIcon, PencilIcon, PowerIcon } from "lucide-react";
import { toast } from "sonner";
import { CampoSelect, CampoTexto } from "@/components/comunes/campos";
import { Confirmar } from "@/components/comunes/confirmar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { useFormulario } from "@/hooks/use-formulario";
import { api, ErrorApi } from "@/lib/cliente-api";
import { usuarioAltaSchema, usuarioEdicionSchema } from "@/lib/esquemas";
import type { UsuarioPublico } from "@/server/servicios/usuarios";

const ROLES = [
  { valor: "vendedor", etiqueta: "Vendedor" },
  { valor: "admin", etiqueta: "Administrador" },
];

/** Alta (sin `usuario`) o edición (con `usuario`) en una ventana modal. */
export function DialogoUsuario({
  usuario,
  children,
  abierto: abiertoExterno,
  alCambiarAbierto,
}: {
  usuario?: UsuarioPublico;
  children?: React.ReactNode;
  abierto?: boolean;
  alCambiarAbierto?: (v: boolean) => void;
}) {
  const router = useRouter();
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const abierto = abiertoExterno ?? abiertoInterno;
  const setAbierto = alCambiarAbierto ?? setAbiertoInterno;

  const [valores, setValores] = useState({
    nombre: usuario?.nombre ?? "",
    email: usuario?.email ?? "",
    rol: usuario?.rol ?? "vendedor",
    password: "",
  });
  const cambiar = (campo: keyof typeof valores, valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }));

  const edicion = !!usuario;
  const { errores, enviando, manejarEnvio, setErrores } = useFormulario(
    edicion ? usuarioEdicionSchema : usuarioAltaSchema,
    (datos) =>
      edicion
        ? api(`/api/usuarios/${usuario.id}`, { method: "PATCH", body: datos })
        : api("/api/usuarios", { body: datos }),
    {
      exito: edicion ? "Usuario actualizado." : "Usuario creado.",
      alTerminar: () => {
        setAbierto(false);
        if (!edicion) setValores({ nombre: "", email: "", rol: "vendedor", password: "" });
        router.refresh();
      },
    },
  );

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) setErrores({});
      }}
    >
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {edicion
              ? "Modificá los datos o el rol."
              : "Indicá una contraseña temporal: el usuario podrá cambiarla desde su perfil."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const { password, ...resto } = valores;
            manejarEnvio(edicion ? resto : { ...resto, password });
          }}
        >
          <FieldGroup>
            <CampoTexto
              id="u-nombre"
              etiqueta="Nombre"
              value={valores.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              error={errores.nombre}
            />
            <CampoTexto
              id="u-email"
              etiqueta="Email"
              type="email"
              value={valores.email}
              onChange={(e) => cambiar("email", e.target.value)}
              error={errores.email}
            />
            <CampoSelect
              id="u-rol"
              etiqueta="Rol"
              valor={valores.rol}
              alCambiar={(v) => cambiar("rol", v)}
              opciones={ROLES}
              error={errores.rol}
            />
            {!edicion && (
              <CampoTexto
                id="u-password"
                etiqueta="Contraseña temporal"
                type="text"
                value={valores.password}
                onChange={(e) => cambiar("password", e.target.value)}
                error={errores.password}
                ayuda="Mínimo 8 caracteres."
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Menú de acciones de cada fila: editar, restablecer contraseña, activar/desactivar. */
export function AccionesUsuario({
  usuario,
  esUnoMismo,
}: {
  usuario: UsuarioPublico;
  esUnoMismo: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [temporal, setTemporal] = useState<string | null>(null);

  async function ejecutar(accion: () => Promise<unknown>, exito: string) {
    try {
      await accion();
      toast.success(exito);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof ErrorApi ? e.message : "No se pudo completar la operación.");
      return false;
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Acciones">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditando(true)}>
            <PencilIcon /> Editar
          </DropdownMenuItem>
          <Confirmar
            titulo="Restablecer contraseña"
            descripcion={`Se generará una contraseña temporal para ${usuario.nombre}. La anterior deja de funcionar.`}
            textoConfirmar="Restablecer"
            destructivo={false}
            alConfirmar={async () => {
              try {
                const r = await api<{ passwordTemporal: string }>(
                  `/api/usuarios/${usuario.id}/reset-password`,
                  { method: "POST" },
                );
                setTemporal(r.passwordTemporal);
                return true;
              } catch (e) {
                toast.error(e instanceof ErrorApi ? e.message : "No se pudo restablecer.");
                return false;
              }
            }}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <KeyRoundIcon /> Restablecer contraseña
            </DropdownMenuItem>
          </Confirmar>
          {!esUnoMismo && (
            <Confirmar
              titulo={usuario.activo ? "Desactivar usuario" : "Reactivar usuario"}
              descripcion={
                usuario.activo
                  ? `${usuario.nombre} no podrá ingresar más al sistema. Si tiene la sesión abierta, la pierde de inmediato.`
                  : `${usuario.nombre} podrá volver a ingresar.`
              }
              textoConfirmar={usuario.activo ? "Desactivar" : "Reactivar"}
              destructivo={usuario.activo}
              alConfirmar={() =>
                ejecutar(
                  () =>
                    api(`/api/usuarios/${usuario.id}`, {
                      method: "PATCH",
                      body: { activo: !usuario.activo },
                    }),
                  usuario.activo ? "Usuario desactivado." : "Usuario reactivado.",
                )
              }
            >
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                variant={usuario.activo ? "destructive" : "default"}
              >
                <PowerIcon /> {usuario.activo ? "Desactivar" : "Reactivar"}
              </DropdownMenuItem>
            </Confirmar>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoUsuario usuario={usuario} abierto={editando} alCambiarAbierto={setEditando} />

      <Dialog open={temporal !== null} onOpenChange={(v) => !v && setTemporal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>
              Comunicásela a {usuario.nombre}. Se muestra una sola vez.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted px-4 py-3 text-center font-mono text-lg tracking-wider select-all">
            {temporal}
          </div>
          <DialogFooter>
            <Button onClick={() => setTemporal(null)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
