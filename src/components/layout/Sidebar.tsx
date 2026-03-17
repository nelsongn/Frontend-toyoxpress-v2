"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ArrowLeftRight,
    Package,
    ShoppingCart,
    Users,
    Settings,
    LogOut,
    UserCog,
    ContactRound,
    Map
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import RequirePermission from "@/components/auth/RequirePermission";
import { MapModal } from "./MapModal";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Movimientos", href: "/movimientos", icon: ArrowLeftRight, perm: "verMovimientos" },
    { name: "Cuentas", href: "/cuentas", icon: Users, perm: "configurarCuentas" },
    { name: "Usuarios", href: "/usuarios", icon: UserCog, perm: "crearUsuarios" },
    { name: "Productos", href: "/productos", icon: Package, perm: "cargarProductos" },
    { name: "Clientes", href: "/clientes", icon: ContactRound, perm: "verClientes" },
    { name: "Pedidos", href: "/pedidos", icon: ShoppingCart },
    { name: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const logout = useAuthStore((state: any) => state.logout);
    const router = useRouter();
    const [mapOpen, setMapOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <div className="flex h-full w-64 flex-col bg-card border-r border-border shadow-sm">
            <div className="flex h-16 items-center flex-shrink-0 px-6 bg-primary text-primary-foreground">
                <img
                    src="https://toyoxpress.com/wp-content/uploads/2017/07/Ai-LOGO-TOYOXPRESS.png"
                    alt="ToyoXpress"
                    className="h-8 w-auto object-contain"
                />
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;

                        const linkContent = (
                            <Link
                                href={item.href}
                                prefetch={false}
                                className={cn(
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                                        "mr-3 h-5 w-5 flex-shrink-0"
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );

                        if (item.perm) {
                            return (
                                <RequirePermission key={item.name} perm={item.perm}>
                                    {linkContent}
                                </RequirePermission>
                            );
                        }

                        return <div key={item.name}>{linkContent}</div>;
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-border">
                <button
                    onClick={() => setMapOpen(true)}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors mb-2"
                >
                    <Map className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    Mapa
                </button>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    Cerrar Sesión
                </button>
            </div>

            <MapModal open={mapOpen} onOpenChange={setMapOpen} />
        </div>
    );
}
