"use client";

import { useEffect, useState } from "react";
import { Clock, Copy, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { horaCaracas, type DiaHorario } from "@/lib/horario";

const MIN_DIA = 24 * 60;

function aMinutos(hhmm: string) {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

/** Minutos abiertos del día (si el cierre es antes que la apertura, cruza medianoche). */
export function minutosAbierto(d: DiaHorario) {
    if (d.cerrado) return 0;
    const a = aMinutos(d.apertura);
    const c = aMinutos(d.cierre);
    return c >= a ? c - a : MIN_DIA - a + c;
}

export function formatoHoras(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}

/** Tramos de la barra de 24 h, en % (dos tramos si cruza medianoche). */
function tramos(d: DiaHorario): [number, number][] {
    if (d.cerrado) return [];
    const a = aMinutos(d.apertura);
    const c = aMinutos(d.cierre);
    const pct = (m: number) => (m / MIN_DIA) * 100;
    if (c >= a) return [[pct(a), pct(c - a)]];
    return [[pct(a), pct(MIN_DIA - a)], [0, pct(c)]];
}

interface Props {
    horario: DiaHorario[];
    onCambio: (indice: number, campo: keyof DiaHorario, valor: string | boolean) => void;
    onCopiarLunes: () => void;
    /** Hora del servidor − hora de este equipo (para "Hoy" y la marca de hora actual) */
    desfaseServidorMs: number | null;
}

const COLUMNAS = "md:grid-cols-[120px_44px_252px_minmax(0,1fr)_72px]";

export function EditorHorario({ horario, onCambio, onCopiarLunes, desfaseServidorMs }: Props) {
    // Hora de Caracas para resaltar "Hoy" y marcar la hora actual; se refresca cada 30 s
    const desfase = desfaseServidorMs ?? 0;
    const [ahora, setAhora] = useState<number | null>(null);
    useEffect(() => {
        const tick = () => setAhora(Date.now() + desfase);
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [desfase]);
    const hoy = ahora !== null ? horaCaracas(ahora) : null;
    const pctAhora = hoy ? ((hoy.horas * 60 + hoy.minutos) / MIN_DIA) * 100 : null;

    return (
        <section aria-labelledby="horario-ingreso" className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 id="horario-ingreso" className="flex items-center gap-2 text-lg font-semibold">
                        <Clock className="h-5 w-5 text-primary dark:text-red-400" aria-hidden="true" />
                        Horario de ingreso
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Fuera de este horario los usuarios no pueden entrar, salvo quienes tienen &quot;Entrar fuera del horario&quot;.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={onCopiarLunes} className="shrink-0 gap-2">
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copiar lunes a días abiertos
                </Button>
            </div>

            {/* Encabezados (pantallas md+) */}
            <div className={cn("hidden md:grid items-center gap-4 px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", COLUMNAS)}>
                <span>Día</span>
                {/* Columna del interruptor: sin título visible, pero debe ocupar su lugar en la grilla */}
                <span aria-hidden="true" />
                <span>Horario</span>
                <span className="flex justify-between font-mono font-normal normal-case tracking-normal" aria-hidden="true">
                    <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                </span>
                <span className="text-right">Horas</span>
            </div>

            <ul className="divide-y divide-border border-t border-border">
                {horario.map((d, i) => {
                    const esHoy = hoy?.dia === d.dia;
                    const cruza = !d.cerrado && aMinutos(d.cierre) < aMinutos(d.apertura);
                    const min = minutosAbierto(d);
                    return (
                        <li
                            key={d.dia}
                            className={cn(
                                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-5 py-3",
                                COLUMNAS,
                                esHoy && "relative bg-secondary before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-primary"
                            )}
                        >
                            {/* Día */}
                            <span className="flex items-center gap-2 text-sm font-medium">
                                {d.dia}
                                {esHoy && (
                                    <span className="rounded-full border border-border px-1.5 text-[11px] font-medium text-muted-foreground">Hoy</span>
                                )}
                            </span>

                            {/* Abierto / cerrado */}
                            <Switch
                                checked={!d.cerrado}
                                onCheckedChange={(v: boolean) => onCambio(i, "cerrado", !v)}
                                aria-label={`${d.dia}: ${d.cerrado ? "cerrado" : "abierto"}`}
                                className="justify-self-end md:justify-self-start"
                            />

                            {/* Horario */}
                            <div className="col-span-2 md:col-span-1">
                                {d.cerrado ? (
                                    <span className="text-sm text-muted-foreground">Cerrado</span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            value={d.apertura}
                                            onChange={(e) => onCambio(i, "apertura", e.target.value)}
                                            aria-label={`${d.dia}: apertura`}
                                            className="h-8 w-[7.5rem] font-mono tabular-nums"
                                        />
                                        <span className="text-muted-foreground" aria-hidden="true">–</span>
                                        <Input
                                            type="time"
                                            value={d.cierre}
                                            onChange={(e) => onCambio(i, "cierre", e.target.value)}
                                            aria-label={`${d.dia}: cierre`}
                                            className="h-8 w-[7.5rem] font-mono tabular-nums"
                                        />
                                    </div>
                                )}
                                {cruza && (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                        <Moon className="h-3 w-3" aria-hidden="true" />
                                        Cruza medianoche: cierra al día siguiente
                                    </p>
                                )}
                            </div>

                            {/* Línea de tiempo de 24 h */}
                            <div className="relative col-span-2 h-2.5 rounded-full bg-muted md:col-span-1" aria-hidden="true">
                                {tramos(d).map(([izq, ancho], k) => (
                                    <div
                                        key={k}
                                        className="absolute inset-y-0 rounded-full bg-primary"
                                        style={{ left: `${izq}%`, width: `${ancho}%` }}
                                    />
                                ))}
                                {esHoy && pctAhora !== null && (
                                    <div
                                        title="Ahora en Caracas"
                                        className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-red-500 dark:bg-red-400"
                                        style={{ left: `${pctAhora}%` }}
                                    />
                                )}
                            </div>

                            {/* Horas */}
                            <span className="hidden text-right font-mono text-sm tabular-nums text-muted-foreground md:block">
                                {d.cerrado ? "—" : formatoHoras(min)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
