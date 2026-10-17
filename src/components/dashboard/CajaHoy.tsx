import { formatoMoneda } from "./tipos";

interface Props {
    ingresos: number;
    egresos: number;
}

/**
 * Resumen de caja del día como una cinta de caja registradora:
 * ingresos, egresos, línea perforada y el neto.
 */
export function CajaHoy({ ingresos, egresos }: Props) {
    const neto = ingresos - egresos;
    return (
        <section aria-labelledby="caja-hoy" className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 id="caja-hoy" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Caja de hoy
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Ingresos</dt>
                    <dd className="font-mono tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        + {formatoMoneda(ingresos)}
                    </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Egresos</dt>
                    <dd className="font-mono tabular-nums font-medium text-red-600 dark:text-red-400">
                        − {formatoMoneda(egresos)}
                    </dd>
                </div>
            </dl>
            {/* Perforación de la cinta */}
            <div className="my-3 border-t-2 border-dashed border-border" aria-hidden="true" />
            <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold text-foreground">Neto del día</span>
                <span
                    className={`font-mono text-2xl font-semibold tabular-nums ${neto < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                >
                    {neto < 0 ? "− " : ""}
                    {formatoMoneda(Math.abs(neto))}
                </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Movimientos aprobados con fecha de hoy</p>
        </section>
    );
}
