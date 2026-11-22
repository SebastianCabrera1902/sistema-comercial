/**
 * Layout compartido por todas las páginas del sistema (sección 4):
 * panel lateral y barra superior. La página de login queda fuera.
 *
 * Segunda barrera de la sesión: si no hay usuario válido, va al login.
 */
import { BarraLateral } from "@/components/layout/barra-lateral";
import { BarraSuperior } from "@/components/layout/barra-superior";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { exigirUsuarioPagina } from "@/server/sesion";

export default async function LayoutSistema({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuarioPagina();
  return (
    <SidebarProvider>
      <BarraLateral esAdmin={usuario.rol === "admin"} />
      <SidebarInset>
        <BarraSuperior usuario={usuario} />
        <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
