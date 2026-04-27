"use client";

import { useAuthStore } from "@/lib/store/useAuthStore";
import { UserCircle, Menu } from "lucide-react";
import { GlobalSyncProgress } from "../productos/GlobalSyncProgress";

export function Header({ toggleSidebar }: { toggleSidebar?: () => void }) {
    const user = useAuthStore((state: any) => state.name);
    const permissions = useAuthStore((state: any) => state.permissions);

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm">
            <div className="flex items-center md:hidden">
                <button onClick={toggleSidebar} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <Menu className="h-6 w-6" />
                </button>
            </div>
            
        <div className="flex items-center justify-end w-full gap-2 md:gap-6">
            <GlobalSyncProgress />
            <div className="flex items-center gap-2 md:gap-4 ml-2">
                <div className="flex flex-col items-end">
                    <span className="text-xs md:text-sm font-medium text-foreground">{user || "Invitado"}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                        {user ? (permissions?.configurarCuentas ? "Administrador" : "Empleado") : "Sin Sesión"}
                    </span>
                </div>
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <UserCircle className="h-5 w-5 md:h-6 md:w-6" />
                </div>
            </div>
        </div>
        </header>
    );
}
