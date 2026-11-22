"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChartColumn, Lock } from "lucide-react";
import RequirePermission from "@/components/auth/RequirePermission";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { VistaVentas } from "@/components/analisis/VistaVentas";
import { VistaInventario } from "@/components/analisis/VistaInventario";
import { VistaCobranza } from "@/components/analisis/VistaCobranza";
import { VistaCaja } from "@/components/analisis/VistaCaja";
import { VistaPlanificador } from "@/components/analisis/VistaPlanificador";
import { VistaLiquidacion } from "@/components/analisis/VistaLiquidacion";
import { fecha } from "@/components/analisis/formato";

const VISTAS = [
    { id: "ventas", nombre: "Ventas" },
    { id: "inventario", nombre: "Inventario y compras" },
    { id: "cobranza", nombre: "Cobranza" },
    { id: "caja", nombre: "Caja y bancos" },
    { id: "planificador", nombre: "Planificador de compras" },
    { id: "liquidacion", nombre: "Liquidación" },
] as const;
type IdVista = (typeof VISTAS)[number]["id"];

function SinPermiso() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Lock className="h-6 w-6" />
            <p className="font-medium text-foreground">No tienes acceso a Análisis</p>
            <p className="text-sm">Pídele a un administrador que active el permiso “Acceso a Análisis” en tu usuario.</p>
        </div>
    );
}

function Analisis() {
    const router = useRouter();
    // La pestaña vive en ?vista= para poder compartir el enlace o recargar sin perderla
    const parametro = useSearchParams().get("vista");
    const vista: IdVista = VISTAS.some((x) => x.id === parametro) ? (parametro as IdVista) : "ventas";
    const [ultimaFactura, setUltimaFactura] = useState<string | null>(null);

    useEffect(() => {
        api.get("/analitica/estado").then((r) => setUltimaFactura(r.data?.ultima_factura ?? null)).catch(() => {});
    }, []);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-1">
                <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
                    <ChartColumn className="h-8 w-8 text-primary" /> Análisis
                </h1>
                <p className="text-muted-foreground">
                    Ventas, inventario, cobranza y bancos con los datos de Valery
                    {ultimaFactura ? <> · al <span className="font-medium text-foreground">{fecha(ultimaFactura)}</span></> : null}. Montos en USD.
                </p>
            </div>

            <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label="Vistas de análisis">
                {VISTAS.map((v) => (
                    <button
                        key={v.id}
                        type="button"
                        onClick={() => router.replace(`/analisis?vista=${v.id}`, { scroll: false })}
                        aria-current={vista === v.id ? "page" : undefined}
                        className={cn(
                            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                            vista === v.id
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {v.nombre}
                    </button>
                ))}
            </nav>

            {vista === "ventas" && <VistaVentas />}
            {vista === "inventario" && <VistaInventario />}
            {vista === "cobranza" && <VistaCobranza />}
            {vista === "caja" && <VistaCaja />}
            {vista === "planificador" && <VistaPlanificador />}
            {vista === "liquidacion" && <VistaLiquidacion />}
        </div>
    );
}

export default function AnalisisPage() {
    return (
        <RequirePermission perm="verAnalitica" fallback={<SinPermiso />}>
            <Suspense fallback={null}>
                <Analisis />
            </Suspense>
        </RequirePermission>
    );
}
