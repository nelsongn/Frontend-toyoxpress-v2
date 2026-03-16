"use client";

import CuentasTable from "@/components/cuentas/CuentasTable";
import RequirePermission from "@/components/auth/RequirePermission";

export default function CuentasPage() {
    return (
        <RequirePermission perm="configurarCuentas">
            <div className="flex-1 space-y-6 pt-6 px-8 max-w-[1200px] mx-auto min-h-[calc(100vh-80px)]">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground border-l-4 border-[#a32240] pl-4 py-1">
                        Configuración de Cuentas
                    </h2>
                </div>

                <CuentasTable />
            </div>
        </RequirePermission>
    );
}
