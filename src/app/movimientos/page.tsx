"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MovesTable from "@/components/movimientos/MovesTable";
import MoveModal from "@/components/movimientos/MoveModal";

// /movimientos?nuevo=1 abre el formulario de nuevo movimiento (lo usa el botón del Dashboard)
function AbrirNuevoDesdeUrl({ onAbrir }: { onAbrir: () => void }) {
    const params = useSearchParams();
    const router = useRouter();
    useEffect(() => {
        if (params.get("nuevo") === "1") {
            onAbrir();
            router.replace("/movimientos");
        }
    }, [params, router, onAbrir]);
    return null;
}

export default function MovimientosPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [abrirNuevo] = useState(() => () => setIsModalOpen(true));

    return (
        <div className="space-y-6">
            <Suspense fallback={null}>
                <AbrirNuevoDesdeUrl onAbrir={abrirNuevo} />
            </Suspense>
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
