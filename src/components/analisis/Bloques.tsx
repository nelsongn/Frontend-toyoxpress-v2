"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, TrendingDown, TrendingUp, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { pct } from "./formato";

// Piezas comunes de los dashboards de Análisis. Mismo lenguaje visual que el Dashboard:
// tarjetas con borde, títulos en versalitas pequeñas y cifras en monoespaciada.
// Sin modificadores de opacidad (bg-x/10): en Chrome 109 de la bodega se ven a color pleno.

/**
 * Carga un endpoint de /analitica y devuelve datos, carga y error. Se recarga al cambiar la URL.
 * Con ruta null no consulta nada (p. ej. el detalle de un mes cuando no hay mes elegido).
 */
export function useAnalitica<T>(ruta: string | null) {
    // Se guarda junto con la ruta que lo produjo: si la ruta cambió, lo guardado es de otra consulta
    const [estado, setEstado] = useState<{ ruta: string; datos: T | null; error: string | null } | null>(null);

    useEffect(() => {
        if (!ruta) return;
        let vigente = true;
        api.get(`/analitica/${ruta}`)
            .then((r) => vigente && setEstado({ ruta, datos: r.data, error: null }))
            .catch((e) => {
                if (!vigente) return;
                setEstado({ ruta, datos: null, error: e?.response?.data?.message || "No se pudo cargar el análisis." });
            });
        return () => {
            vigente = false;
        };
    }, [ruta]);

    if (!ruta) return { datos: null, error: null, cargando: false };
    const listo = estado?.ruta === ruta;
    return { datos: listo ? estado.datos : null, error: listo ? estado.error : null, cargando: !listo };
}

export function EstadoCarga({ cargando, error }: { cargando: boolean; error: string | null }) {
    if (error) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-destructive">
                <span className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> {error}</span>
            </div>
        );
    }
    if (cargando) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
                <span className="flex items-center gap-2"><Activity className="h-5 w-5 animate-pulse" /> Calculando…</span>
            </div>
        );
    }
    return null;
}

export function Panel({
    titulo, detalle, children, className, accion,
}: { titulo: string; detalle?: string; children: React.ReactNode; className?: string; accion?: React.ReactNode }) {
    return (
        <section className={cn("min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm", className)}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
                    {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
                </div>
                {accion}
            </div>
            {children}
        </section>
    );
}

/**
 * Cifra clave con su comparación contra el período anterior (si la hay).
 * menosEsMejor: para cifras como los descuentos, donde subir es una mala noticia (se pinta en rojo).
 */
export function Kpi({
    titulo, valor, detalle, cambio, alerta, menosEsMejor = false,
}: { titulo: string; valor: string; detalle?: string; cambio?: number | null; alerta?: boolean; menosEsMejor?: boolean }) {
    const bueno = cambio != null && (menosEsMejor ? cambio <= 0 : cambio >= 0);
    return (
        <div className={cn("min-w-0 rounded-lg border bg-card p-4 shadow-sm", alerta ? "border-red-500" : "border-border")}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
            <p className={cn("mt-1 truncate font-mono text-2xl font-semibold tabular-nums", alerta ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                {valor}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {cambio != null && (
                    <span className={cn("inline-flex items-center gap-0.5 font-medium", bueno ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {cambio >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {cambio >= 0 ? "+" : "−"}{pct(Math.abs(cambio))}
                    </span>
                )}
                {detalle && <span>{detalle}</span>}
            </div>
        </div>
    );
}

export function FilaKpis({ children, columnas = 4 }: { children: React.ReactNode; columnas?: 4 | 5 }) {
    return <div className={cn("grid grid-cols-2 gap-3", columnas === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4")}>{children}</div>;
}

/**
 * Franja que dice qué se está mostrando debajo de un gráfico por mes: todo el período o el mes elegido.
 * Con un mes elegido, se resalta y ofrece volver al período completo.
 */
export function FranjaDetalle({ titulo, resumen, onQuitar }: { titulo: string; resumen?: string; onQuitar?: () => void }) {
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5", onQuitar ? "border-primary" : "border-border")}>
            <p className="text-sm">
                <span className="text-muted-foreground">Mostrando: </span>
                <span className="inline-block font-semibold first-letter:uppercase">{titulo}</span>
                {resumen && <span className="text-muted-foreground"> · {resumen}</span>}
            </p>
            {onQuitar && (
                <button type="button" onClick={onQuitar} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" /> Ver todo el período
                </button>
            )}
        </div>
    );
}

/** Barra horizontal dentro de una celda: proporción del valor contra el máximo de la columna. */
export function BarraCelda({ valor, maximo, texto, tono = "primary" }: { valor: number; maximo: number; texto: string; tono?: "primary" | "rojo" }) {
    const ancho = maximo > 0 ? Math.max(2, Math.round((Math.max(valor, 0) / maximo) * 100)) : 0;
    return (
        <div className="flex items-center justify-end gap-2">
            <div className="hidden h-2 w-24 overflow-hidden rounded-sm bg-muted sm:block" aria-hidden="true">
                <div className={cn("h-full rounded-r-sm", tono === "rojo" ? "bg-red-500" : "bg-primary")} style={{ width: `${ancho}%` }} />
            </div>
            <span className="min-w-[4.5rem] text-right font-mono tabular-nums">{texto}</span>
        </div>
    );
}

/** Tabla compacta con desplazamiento horizontal propio (la página nunca se desplaza de lado). */
export function Tabla({ children }: { children: React.ReactNode }) {
    return (
        <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[560px] text-sm">{children}</table>
        </div>
    );
}

export const th = "border-b border-border py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:pr-0";
export const thNum = cn(th, "text-right");
export const td = "border-b border-border py-2 pr-3 align-top last:pr-0";
export const tdNum = cn(td, "text-right font-mono tabular-nums");
export const tdCodigo = cn(td, "whitespace-nowrap font-mono text-xs text-muted-foreground");
