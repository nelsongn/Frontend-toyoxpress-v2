"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface DatosSincronizacion {
    pedidos: {
        atascados: number;
        conError24h: number;
        ultimoProcesadoEn: string | null;
    };
    productos: {
        archivo: string;
        estado: "pending" | "processing" | "completed" | "failed";
        lotesProcesados: number;
        lotesTotales: number;
        creados: number;
        actualizados: number;
        fallidos: number;
        iniciadaEn: string;
        actualizadaEn: string;
    } | null;
}

interface Props {
    datos: DatosSincronizacion;
    /** Mostrar la cola de pedidos (permiso verPedidos) */
    verPedidos: boolean;
    /** Mostrar la carga de productos (permiso cargarProductos) */
    verProductos: boolean;
}

type Nivel = "ok" | "demora" | "error";

// Una carga de productos sin avances en este tiempo se considera detenida
const CARGA_DETENIDA_MS = 15 * 60 * 1000;

const ESTILOS: Record<Nivel, { icono: typeof CheckCircle2; color: string; borde: string; titulo: string }> = {
    ok: { icono: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", borde: "border-l-emerald-500", titulo: "Sincronización al día" },
    demora: { icono: AlertTriangle, color: "text-amber-600 dark:text-amber-400", borde: "border-l-amber-500", titulo: "Sincronización con demora" },
    error: { icono: XCircle, color: "text-red-600 dark:text-red-400", borde: "border-l-red-500", titulo: "Sincronización con errores" },
};

function haceCuanto(fecha: string | null, ahora: number): string {
    if (!fecha) return "sin registro";
    const minutos = Math.round((ahora - new Date(fecha).getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
    if (minutos < 60) return rtf.format(-minutos, "minute");
    if (minutos < 60 * 24) return rtf.format(-Math.round(minutos / 60), "hour");
    return rtf.format(-Math.round(minutos / (60 * 24)), "day");
}

function plural(n: number, singular: string, pluralTxt: string) {
    return `${n} ${n === 1 ? singular : pluralTxt}`;
}

/**
 * Estado real de la Lambda que procesa las colas SQS (pedidos y carga de productos),
 * calculado con los datos que guarda el backend. Reemplaza el antiguo "Worker SQS Activo" fijo.
 */
export function EstadoSincronizacion({ datos, verPedidos, verProductos }: Props) {
    // Hora de referencia fija por render: el panel se recarga con cada visita
    const [ahora] = useState(() => Date.now());

    if (!verPedidos && !verProductos) return null;

    const { pedidos, productos } = datos;
    const avisos: { nivel: Nivel; texto: string }[] = [];
    const detalles: string[] = [];

    if (verPedidos) {
        if (pedidos.conError24h > 0) {
            avisos.push({ nivel: "error", texto: `${plural(pedidos.conError24h, "pedido", "pedidos")} con error en las últimas 24 h` });
        }
        if (pedidos.atascados > 0) {
            avisos.push({ nivel: "demora", texto: `${plural(pedidos.atascados, "pedido espera", "pedidos esperan")} hace más de 10 min` });
        }
        detalles.push(`Último pedido procesado ${haceCuanto(pedidos.ultimoProcesadoEn, ahora)}`);
    }

    if (verProductos && productos) {
        const enCurso = productos.estado === "pending" || productos.estado === "processing";
        const detenida = enCurso && ahora - new Date(productos.actualizadaEn).getTime() > CARGA_DETENIDA_MS;

        if (productos.estado === "failed") {
            avisos.push({ nivel: "error", texto: "La última carga de productos falló" });
        } else if (detenida) {
            avisos.push({ nivel: "demora", texto: `La carga de productos no avanza desde ${haceCuanto(productos.actualizadaEn, ahora)}` });
        }

        if (enCurso && !detenida) {
            detalles.push(`Cargando productos: lote ${productos.lotesProcesados} de ${productos.lotesTotales}`);
        } else {
            const fallidos = productos.fallidos > 0 ? `, ${productos.fallidos} fallidos` : "";
            detalles.push(`Última carga de productos ${haceCuanto(productos.actualizadaEn, ahora)} (${productos.actualizados} actualizados, ${productos.creados} nuevos${fallidos})`);
        }
    }

    const nivel: Nivel = avisos.some((a) => a.nivel === "error") ? "error" : avisos.length > 0 ? "demora" : "ok";
    const estilo = ESTILOS[nivel];
    const Icono = estilo.icono;

    return (
        <Card className={`shadow-sm border-border border-l-4 ${estilo.borde}`}>
            <CardContent className="p-4 flex items-start gap-3">
                <Icono className={`h-5 w-5 shrink-0 mt-0.5 ${estilo.color}`} aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                    <p className={`text-sm font-semibold ${estilo.color}`}>{estilo.titulo}</p>
                    {avisos.map((a) => (
                        <p key={a.texto} className="text-sm text-foreground">{a.texto}</p>
                    ))}
                    {detalles.map((d) => (
                        <p key={d} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <RefreshCw className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
                            {d}
                        </p>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
