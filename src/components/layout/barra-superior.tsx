"use client";

/** Barra superior: usuario conectado, acceso al perfil y botón de salir. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOutIcon, UserIcon } from "lucide-react";
import { InsigniaRol } from "@/components/comunes/insignias";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { api } from "@/lib/cliente-api";
import type { UsuarioSesion } from "@/server/permisos";

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export function BarraSuperior({ usuario }: { usuario: UsuarioSesion }) {
  const router = useRouter();

  async function salir() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {iniciales(usuario.nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-medium">{usuario.nombre}</div>
              <div className="text-xs text-muted-foreground">
                {usuario.rol === "admin" ? "Administrador" : "Vendedor"}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span>{usuario.nombre}</span>
            <span className="text-xs font-normal text-muted-foreground">{usuario.email}</span>
            <InsigniaRol rol={usuario.rol} />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <UserIcon /> Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={salir} variant="destructive">
            <LogOutIcon /> Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" onClick={salir} className="hidden md:inline-flex">
        <LogOutIcon /> Salir
      </Button>
    </header>
  );
}
