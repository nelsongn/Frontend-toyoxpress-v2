"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { estadoHorario, horaCaracas, type DiaHorario } from "@/lib/horario";
import { DisplayLed } from "./DisplayLed";

interface Props {
    horario: DiaHorario[];
    /** Diferencia hora del servidor − hora de este equipo, en ms (de GET /configuracion) */
    desfaseServidorMs: number | null;
}

// Más de 2 minutos de diferencia con el servidor: vale la pena avisar
const DESFASE_AVISO_MS = 2 * 60 * 1000;

const ESTADOS = {
    dentro: { texto: "Dentro del horario", clase: "text-emerald-600 dark:text-emerald-400 border-emerald-500" },
    fuera: { texto: "Fuera del horario", clase: "text-amber-600 dark:text-amber-400 border-amber-500" },
    cerrado: { texto: "Hoy cerrado", clase: "text-red-600 dark:text-red-400 border-red-500" },
    "sin-horario": { texto: "Sin horario para hoy", clase: "text-muted-foreground border-border" },
} as const;

/**
 * Reloj digital en hora de Caracas. Usa la hora del servidor (corregida por el desfase de
 * este equipo), que es la misma que usa HorarioShield para permitir o bloquear el ingreso.
 */
export function RelojCaracas({ horario, desfaseServidorMs }: Props) {
    const desfase = desfaseServidorMs ?? 0;
    const [ahora, setAhora] = useState<number | null>(null);

    useEffect(() => {
        const tick = () => setAhora(Date.now() + desfase);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [desfase]);

    if (ahora === null) return null;

    const hora = horaCaracas(ahora);
    const { estado, hoy } = estadoHorario(horario, hora);
    const estilo = ESTADOS[estado];
    const desfaseMin = Math.round(Math.abs(desfase) / 60000);

    return (
        <section aria-label="Hora actual en Caracas" className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Hora de Caracas · UTC−4
                    </p>
                    <div className="mt-2">
                        <DisplayLed horas={hora.horas} minutos={hora.minutos} segundos={hora.segundos} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {hora.dia}, {hora.fecha}
                    </p>
                </div>

                <div className="sm:text-right">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium", estilo.clase)}>
                        {estilo.texto}
                    </span>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {hoy
                            ? hoy.cerrado
                                ? `Hoy (${hoy.dia.toLowerCase()}) no se puede ingresar`
                                : `Hoy (${hoy.dia.toLowerCase()}) de ${hoy.apertura} a ${hoy.cierre}`
                            : "Agrega este día en el horario de abajo"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Según el horario de esta página</p>
                </div>
            </div>

            {desfaseServidorMs !== null && Math.abs(desfase) > DESFASE_AVISO_MS && (
                <p className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    La hora de este equipo está desfasada unos {desfaseMin} min. El reloj y el control de ingreso usan la hora del servidor, así que no afecta al sistema.
                </p>
            )}
        </section>
    );
}
