"use client";

import { useState } from "react";
import { ContactRound } from "lucide-react";
import { UploadClientesBtn } from "@/components/clientes/UploadClientesBtn";
import { ClientesTable } from "@/components/clientes/ClientesTable";
import RequirePermission from "@/components/auth/RequirePermission";

export default function ClientesPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <RequirePermission perm="verPedidos">
            <div className="flex flex-col h-full p-6 gap-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ContactRound className="h-6 w-6 text-primary" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight leading-tight">Clientes</h1>
                            <p className="text-xs text-muted-foreground">Directorio sincronizado desde Excel</p>
                        </div>
                    </div>
                    <RequirePermission perm="verClientes">
                        <UploadClientesBtn onSuccess={() => setRefreshTrigger(n => n + 1)} />
                    </RequirePermission>
                </div>

                {/* Table card — fills remaining space */}
                <div className="flex-1 bg-card rounded-xl border border-border shadow-sm p-4 min-h-0 overflow-auto">
                    <ClientesTable refreshTrigger={refreshTrigger} />
                </div>
            </div>
        </RequirePermission>
    );
}
