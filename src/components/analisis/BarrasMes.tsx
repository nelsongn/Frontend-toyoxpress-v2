"use client";

import { useState } from "react";
import { mesCorto, usd, usdCorto } from "./formato";

export interface PuntoMes {
    mes: string;            // 'AAAA-MM'
    valor: number;          // altura de la barra
    detalle?: string[];     // líneas extra del recuadro al pasar el mouse
}

/**
 * Barras por mes, una sola serie, con su recuadro de detalle al pasar el mouse o tocar.
 * Con onSeleccionar, un clic elige el mes (y otro clic sobre el mismo lo suelta); el elegido
 * queda en color y los demás en gris.
 * SVG propio: no suma librerías y funciona en el Chrome 109 de la bodega.
 */
export function BarrasMes({
    puntos, etiqueta, formato = usdCorto, formatoValor = usd, seleccionado = null, onSeleccionar,
}: {
    puntos: PuntoMes[];
    etiqueta: string;
    /** Guías del eje (abreviado: $10k) */
    formato?: (n: number) => string;
    /** Valor en el recuadro al pasar el mouse (completo, con 2 decimales) */
    formatoValor?: (n: number) => string;
    seleccionado?: string | null;
    onSeleccionar?: (mes: string | null) => void;
}) {
    const [activo, setActivo] = useState<number | null>(null);
    if (!puntos.length) return <p className="text-sm text-muted-foreground">Sin datos en el período.</p>;

    const W = 720, H = 220, izq = 8, der = 8, arriba = 18, abajo = 26;
    const maxValor = Math.max(...puntos.map((p) => p.valor), 0);
    const tope = maxValor > 0 ? escalaBonita(maxValor) : 1;
    const ancho = (W - izq - der) / puntos.length;
    const alto = H - arriba - abajo;
    const y = (v: number) => arriba + alto * (1 - Math.max(v, 0) / tope);
    const p = activo != null ? puntos[activo] : null;

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={etiqueta}>
                {[0.5, 1].map((t) => (
                    <g key={t}>
                        <line x1={izq} x2={W - der} y1={y(tope * t)} y2={y(tope * t)} className="stroke-border" strokeWidth={1} strokeDasharray="3 4" />
                        <text x={W - der} y={y(tope * t) - 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
                            {formato(tope * t)}
                        </text>
                    </g>
                ))}
                <line x1={izq} x2={W - der} y1={y(0)} y2={y(0)} className="stroke-border" strokeWidth={1} />
                {puntos.map((pt, i) => {
                    const w = Math.max(ancho * 0.62, 3);
                    const x = izq + i * ancho + (ancho - w) / 2;
                    const top = y(pt.valor);
                    const h = Math.max(y(0) - top, pt.valor > 0 ? 2 : 0);
                    const color = activo === i
                        ? "fill-foreground"
                        : seleccionado && seleccionado !== pt.mes ? "fill-muted-foreground" : "fill-primary";
                    const elegir = () => onSeleccionar?.(seleccionado === pt.mes ? null : pt.mes);
                    return (
                        <g key={pt.mes}>
                            <path d={barra(x, y(0), w, h)} className={color} />
                            {/* Zona de toque más ancha que la barra */}
                            <rect
                                x={izq + i * ancho} y={arriba} width={ancho} height={alto + abajo}
                                fill="transparent"
                                className={onSeleccionar ? "cursor-pointer focus:outline-none" : undefined}
                                onMouseEnter={() => setActivo(i)}
                                onMouseLeave={() => setActivo(null)}
                                onClick={() => (onSeleccionar ? elegir() : setActivo(activo === i ? null : i))}
                                {...(onSeleccionar && {
                                    role: "button",
                                    tabIndex: 0,
                                    "aria-label": `Ver ${mesCorto(pt.mes)}`,
                                    "aria-pressed": seleccionado === pt.mes,
                                    onKeyDown: (e: React.KeyboardEvent) => {
                                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); }
                                    },
                                })}
                            />
                            {(puntos.length <= 13 || i % 2 === 0) && (
                                <text
                                    x={izq + i * ancho + ancho / 2} y={H - 8} textAnchor="middle" fontSize={11}
                                    className={seleccionado === pt.mes ? "pointer-events-none fill-foreground font-semibold" : "pointer-events-none fill-muted-foreground"}
                                >
                                    {mesCorto(pt.mes)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {p && (
                <div
                    className="pointer-events-none absolute top-0 z-10 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
                    style={{ left: `${Math.min(((activo! + 0.5) / puntos.length) * 100, 78)}%` }}
                >
                    <p className="font-semibold">{mesCorto(p.mes)}</p>
                    <p className="font-mono tabular-nums">{etiqueta}: {formatoValor(p.valor)}</p>
                    {p.detalle?.map((d) => <p key={d} className="text-muted-foreground">{d}</p>)}
                </div>
            )}
        </div>
    );
}

/** Barra con las esquinas de arriba redondeadas y la base recta sobre el eje. */
function barra(x: number, base: number, w: number, h: number): string {
    if (h <= 0) return "";
    const r = Math.min(4, w / 2, h);
    const top = base - h;
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

/** Redondea el máximo hacia arriba a 1, 2 o 5 × 10ⁿ para que las líneas de guía caigan en números limpios. */
function escalaBonita(v: number): number {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 5, 10]) if (v <= m * p) return m * p;
    return 10 * p;
}
