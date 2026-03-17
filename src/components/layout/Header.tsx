"use client";

import { useAuthStore } from "@/lib/store/useAuthStore";
import { UserCircle } from "lucide-react";
import { GlobalSyncProgress } from "../productos/GlobalSyncProgress";

export function Header() {
    const user = useAuthStore((state: any) => state.name);

    return (
        <header className="flex h-16 items-center justify-end border-b border-border bg-card px-6 shadow-sm">
            <div className="flex items-center gap-6">
                <GlobalSyncProgress />
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-foreground">{user || "Invitado"}</span>
                        <span className="text-xs text-muted-foreground">{user ? "Administrador" : "Sin Sesión"}</span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserCircle className="h-6 w-6" />
                    </div>
                </div>
            </div>
        </header>
    );
}
