import {
    LayoutDashboard,
    ArrowLeftRight,
    Package,
    ShoppingCart,
    Landmark,
    Clock,
    UserCog,
    ContactRound,
    type LucideIcon,
} from "lucide-react";
import { PERMISOS_PRODUCTOS } from "@/lib/permissions";

export type GrupoNavegacion = "Ventas" | "Finanzas" | "Inventario" | "Administración";

export interface ItemNavegacion {
    name: string;
    href: string;
    icon: LucideIcon;
    perm?: string | string[];
    general?: boolean;
    /** Grupo del menú (el Dashboard va solo, arriba) */
    grupo?: GrupoNavegacion;
}

// Menú lateral. Lo usan el Sidebar y la vista previa de permisos del mantenedor de usuarios.
// general: el Dashboard se oculta a quien solo tiene acceso a secciones
// puntuales (p. ej. solo "Ver Productos"); ver veSeccionesGenerales en lib/permissions.
// El orden de los ítems define el orden de los grupos.
export const navigation: ItemNavegacion[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, general: true },
    { name: "Pedidos", href: "/pedidos", icon: ShoppingCart, perm: "verPedidos", grupo: "Ventas" },
    { name: "Clientes", href: "/clientes", icon: ContactRound, perm: "verPedidos", grupo: "Ventas" },
    { name: "Movimientos", href: "/movimientos", icon: ArrowLeftRight, perm: "verMovimientos", grupo: "Finanzas" },
    { name: "Cuentas", href: "/cuentas", icon: Landmark, perm: "configurarCuentas", grupo: "Finanzas" },
    { name: "Productos", href: "/productos", icon: Package, perm: PERMISOS_PRODUCTOS, grupo: "Inventario" },
    { name: "Usuarios", href: "/usuarios", icon: UserCog, perm: "crearUsuarios", grupo: "Administración" },
    // Antes "Configuración": solo tenía el horario de ingreso (el tema está en el Header)
    { name: "Horarios", href: "/horarios", icon: Clock, perm: "horasIngreso", grupo: "Administración" },
];
