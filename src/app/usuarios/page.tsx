"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import UsersTable from "@/components/usuarios/UsersTable";
import UserModal from "@/components/usuarios/UserModal";
import RequirePermission from "@/components/auth/RequirePermission";

export default function UsuariosPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Usuarios</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona el personal y configura de forma granular sus accesos al sistema.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <RequirePermission perm="crearUsuarios">
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Nuevo Usuario
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm">
                <UsersTable />
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    // Dispatch custom event listened strictly inside UsersTable to trigger data refetch
                    window.dispatchEvent(new Event("refresh_usuarios"));
                }}
            />
        </div>
    );
}
