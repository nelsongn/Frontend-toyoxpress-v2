"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ShoppingCart, ClipboardList, BookOpen } from "lucide-react";
import { VentaForm } from "@/components/pedidos/VentaForm";
import { HistorialPedidos } from "@/components/pedidos/HistorialPedidos";
import RequirePermission from "@/components/auth/RequirePermission";

const InventarioModal = dynamic(() => import("@/components/pedidos/InventarioModal").then(mod => mod.InventarioModal), {
    ssr: false,
    loading: () => null
});

type Tab = "nueva" | "historial";

export default function PedidosPage() {
    const [tab, setTab] = useState<Tab>("nueva");
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showInventario, setShowInventario] = useState(false);

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "nueva", label: "Nueva Venta", icon: <ShoppingCart className="h-4 w-4" /> },
        { id: "historial", label: "Historial", icon: <ClipboardList className="h-4 w-4" /> },
    ];

    return (
        <RequirePermission perm="verPedidos">
            <div className="flex flex-col h-full p-6 gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight leading-tight">Pedidos</h1>
                            <p className="text-xs text-muted-foreground">Crea y gestiona tus órdenes de venta</p>
                        </div>
                    </div>

                    {/* Inventory button — always visible in the header */}
                    <button
                        onClick={() => setShowInventario(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 rounded-xl transition-colors shadow-sm"
                    >
                        <BookOpen className="h-4 w-4" />
                        Ver Inventario
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id
                                ? "bg-card shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-auto">
                    {tab === "nueva" && (
                        <VentaForm onSuccess={() => { setRefreshTrigger(n => n + 1); setTab("historial"); }} />
                    )}
                    {tab === "historial" && (
                        <HistorialPedidos refreshTrigger={refreshTrigger} />
                    )}
                </div>

                {/* Inventory modal */}
                <InventarioModal open={showInventario} onClose={() => setShowInventario(false)} />
            </div>
        </RequirePermission>
    );
}
