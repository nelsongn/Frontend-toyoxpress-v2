import Link from "next/link";
import { ArrowRight, ArrowLeftRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatoFecha, formatoMoneda, type MovimientoReciente, type PedidoReciente } from "./tipos";

function Encabezado({ icono: Icono, titulo, href, enlace }: { icono: typeof ShoppingBag; titulo: string; href: string; enlace: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icono className="h-4 w-4 text-primary dark:text-red-400" aria-hidden="true" />
                {titulo}
            </h2>
            <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {enlace}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
        </div>
    );
}

const ESTADO_PEDIDO: Record<string, { texto: string; clase: string }> = {
    completado: { texto: "Completado", clase: "text-emerald-600 dark:text-emerald-400 border-emerald-500" },
    procesando: { texto: "Procesando", clase: "text-blue-600 dark:text-blue-400 border-blue-500" },
    pendiente: { texto: "Pendiente", clase: "text-amber-600 dark:text-amber-400 border-amber-500" },
    error: { texto: "Error", clase: "text-red-600 dark:text-red-400 border-red-500" },
};

export function UltimosPedidos({ pedidos }: { pedidos: PedidoReciente[] }) {
    return (
        <section aria-label="Últimos pedidos" className="rounded-lg border border-border bg-card shadow-sm">
            <Encabezado icono={ShoppingBag} titulo="Últimos pedidos" href="/pedidos" enlace="Ver pedidos" />
            {pedidos.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No hay pedidos recientes.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {pedidos.map((p) => {
                        const estado = p.estado ? ESTADO_PEDIDO[p.estado] : undefined;
                        return (
                            <li key={p._id} className="flex items-center justify-between gap-4 px-5 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{p.payload?.cliente?.Nombre || "Desconocido"}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        Vendedor: {p.vendedorName || p.vendedorId || "N/A"} · {formatoFecha(p.creadoEn || p.createdAt)}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {formatoMoneda(p.payload?.total || 0)}
                                    </p>
                                    {estado && (
                                        <span className={cn("mt-0.5 inline-block rounded-full border px-2 py-px text-[11px] font-medium", estado.clase)}>
                                            {estado.texto}
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

export function UltimosMovimientos({ movimientos }: { movimientos: MovimientoReciente[] }) {
    return (
        <section aria-label="Últimos movimientos" className="rounded-lg border border-border bg-card shadow-sm">
            <Encabezado icono={ArrowLeftRight} titulo="Últimos movimientos" href="/movimientos" enlace="Ver movimientos" />
            {movimientos.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No hay movimientos registrados.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {movimientos.map((m) => {
                        const ingreso = m.tipo === "ingreso";
                        return (
                            <li key={m._id} className="flex items-center justify-between gap-4 px-5 py-3">
                                <p className="min-w-0 truncate text-sm font-medium text-foreground">{m.referencia}</p>
                                <div className="flex shrink-0 items-center gap-3">
                                    <span
                                        className={cn(
                                            "rounded-full border px-2 py-px text-[11px] font-medium",
                                            ingreso ? "text-emerald-600 dark:text-emerald-400 border-emerald-500" : "text-red-600 dark:text-red-400 border-red-500"
                                        )}
                                    >
                                        {ingreso ? "Ingreso" : "Egreso"}
                                    </span>
                                    <span
                                        className={cn(
                                            "min-w-[92px] text-right font-mono text-sm font-semibold tabular-nums",
                                            ingreso ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                        )}
                                    >
                                        {ingreso ? "+" : "−"}{formatoMoneda(m.monto)}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
