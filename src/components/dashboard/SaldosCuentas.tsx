import { CreditCard } from "lucide-react";
import { formatoMoneda, type CuentaSaldo } from "./tipos";

interface Props {
    cuentas: CuentaSaldo[];
    /** Solo con el permiso "Ver saldo total" (verSaldoTotal); si no, null y no se muestra */
    total: number | null;
}

/** Saldo por cuenta con barra proporcional sobre la suma de los saldos positivos, de menor a mayor saldo. */
export function SaldosCuentas({ cuentas, total }: Props) {
    const sumaPositivos = cuentas.reduce((s, c) => s + Math.max(c.balance, 0), 0);
    // La de menos dinero arriba y la de más abajo
    const ordenadas = [...cuentas].sort((a, b) => a.balance - b.balance);

    return (
        <section aria-labelledby="saldos-cuentas" className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3">
                <h2 id="saldos-cuentas" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="h-4 w-4 text-primary dark:text-red-400" aria-hidden="true" />
                    Distribución de saldos
                </h2>
            </div>
            <div className="p-5">
                {total !== null && (
                    <div className="mb-4 flex items-baseline justify-between gap-4 rounded-md bg-muted px-3 py-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                        <span className={`font-mono font-semibold tabular-nums ${total < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {formatoMoneda(total)}
                        </span>
                    </div>
                )}
                {cuentas.length === 0 ? (
                    <p className="my-6 text-center text-sm text-muted-foreground">No hay cuentas configuradas.</p>
                ) : (
                    <ul className="space-y-4">
                        {ordenadas.map((c) => {
                            const color = c.color || "#94a3b8";
                            const porcentaje = sumaPositivos > 0 && c.balance > 0 ? (c.balance / sumaPositivos) * 100 : 0;
                            return (
                                <li key={c.nombre}>
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                                            <span className="truncate">{c.nombre}</span>
                                        </span>
                                        <span
                                            className={`shrink-0 font-mono font-semibold tabular-nums ${c.balance < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
                                        >
                                            {formatoMoneda(c.balance)}
                                        </span>
                                    </div>
                                    {porcentaje > 0 && (
                                        <div className="mt-1.5 h-1 rounded-full bg-muted" aria-hidden="true">
                                            <div className="h-1 rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: color }} />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
