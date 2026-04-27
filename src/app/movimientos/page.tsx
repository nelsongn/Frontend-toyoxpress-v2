"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MovesTable from "@/components/movimientos/MovesTable";
import MoveModal from "@/components/movimientos/MoveModal";

export default function MovimientosPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Movimientos</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona los ingresos y egresos financieros del sistema.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Nuevo Movimiento
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm">
                <MovesTable />
            </div>

            <MoveModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    // Logica para mutar el store o re-fetch the tabla de movimientos
                    setIsModalOpen(false);
                    window.dispatchEvent(new Event("refresh_movimientos"));
                }}
            />
        </div>
    );
}
