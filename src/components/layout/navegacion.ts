import {
    LayoutDashboard,
    ArrowLeftRight,
    Package,
    ShoppingCart,
    Users,
    Settings,
    UserCog,
    ContactRound,
    type LucideIcon,
} from "lucide-react";
import { PERMISOS_PRODUCTOS } from "@/lib/permissions";

export interface ItemNavegacion {
    name: string;
    href: string;
    icon: LucideIcon;
    perm?: string | string[];
    general?: boolean;
}

// Menú lateral. Lo usan el Sidebar y la vista previa de permisos del mantenedor de usuarios.
// general: Dashboard y Configuración se ocultan a quien solo tiene acceso a secciones
// puntuales (p. ej. solo "Ver Productos"); ver veSeccionesGenerales en lib/permissions.
export const navigation: ItemNavegacion[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, general: true },
    { name: "Movimientos", href: "/movimientos", icon: ArrowLeftRight, perm: "verMovimientos" },
    { name: "Cuentas", href: "/cuentas", icon: Users, perm: "configurarCuentas" },
    { name: "Usuarios", href: "/usuarios", icon: UserCog, perm: "crearUsuarios" },
    { name: "Productos", href: "/productos", icon: Package, perm: PERMISOS_PRODUCTOS },
    { name: "Clientes", href: "/clientes", icon: ContactRound, perm: "verPedidos" },
    { name: "Pedidos", href: "/pedidos", icon: ShoppingCart, perm: "verPedidos" },
    // Configuración solo tiene el horario de ingreso (el tema está en el Header)
    { name: "Configuración", href: "/configuracion", icon: Settings, general: true, perm: "horasIngreso" },
];
