"use client";

/**
 * Panel lateral fijo con los cinco módulos (sección 4). Resalta el módulo
 * activo y en pantallas chicas se colapsa en un menú (lo maneja shadcn/ui).
 * El módulo Usuarios solo se muestra al administrador; de todos modos, el
 * permiso real lo controla el servidor.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoxesIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagsIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { titulo: string; href: string; icono: React.ElementType };
type Grupo = { titulo: string; items: Item[]; soloAdmin?: boolean };

const GRUPOS: Grupo[] = [
  { titulo: "General", items: [{ titulo: "Inicio", href: "/", icono: LayoutDashboardIcon }] },
  {
    titulo: "Ventas",
    items: [
      { titulo: "Nueva venta", href: "/ventas/nueva", icono: ShoppingCartIcon },
      { titulo: "Facturas", href: "/ventas", icono: FileTextIcon },
    ],
  },
  {
    titulo: "Productos",
    items: [
      { titulo: "Catálogo", href: "/productos", icono: BoxesIcon },
      { titulo: "Categorías", href: "/productos/categorias", icono: TagsIcon },
      { titulo: "Movimientos de stock", href: "/productos/movimientos", icono: HistoryIcon },
    ],
  },
  {
    titulo: "Clientes",
    items: [
      { titulo: "Clientes", href: "/clientes", icono: UsersIcon },
      { titulo: "Saldos", href: "/clientes/saldos", icono: WalletIcon },
    ],
  },
  {
    titulo: "Administración",
    soloAdmin: true,
    items: [{ titulo: "Usuarios", href: "/usuarios", icono: UserCogIcon }],
  },
];

const TODOS = GRUPOS.flatMap((g) => g.items.map((i) => i.href));

/** El ítem activo es el de ruta más larga que coincide con la actual. */
function hrefActivo(pathname: string) {
  return TODOS.filter((h) => h === pathname || (h !== "/" && pathname.startsWith(`${h}/`))).sort(
    (a, b) => b.length - a.length,
  )[0];
}

export function BarraLateral({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname();
  const activo = hrefActivo(pathname);
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <StoreIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Mostrador</span>
                  <span className="truncate text-xs opacity-70">Gestión comercial</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GRUPOS.filter((g) => !g.soloAdmin || esAdmin).map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel className="text-sidebar-foreground/50">{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={activo === item.href}
                      tooltip={item.titulo}
                      className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icono />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 pb-3 text-xs text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
        Comprobantes internos sin validez fiscal
      </SidebarFooter>
    </Sidebar>
  );
}
