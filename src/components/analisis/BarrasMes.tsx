"use client";

import { useState } from "react";
import { mesCorto, usdCorto } from "./formato";

export interface PuntoMes {
    mes: string;            // 'AAAA-MM'
    valor: number;          // altura de la barra
    detalle?: string[];     // líneas extra del recuadro al pasar el mouse
}

/**
 * Barras por mes, una sola serie, con su recuadro de detalle al pasar el mouse o tocar.
 * SVG propio: no suma librerías y funciona en el Chrome 109 de la bodega.
 */
export function BarrasMes({ puntos, etiqueta, formato = usdCorto }: { puntos: PuntoMes[]; etiqueta: string; formato?: (n: number) => string }) {
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
                    return (
                        <g key={pt.mes}>
                            <path
                                d={barra(x, y(0), w, h)}
                                className={activo === i ? "fill-foreground" : "fill-primary"}
                            />
                            {/* Zona de toque más ancha que la barra */}
                            <rect
                                x={izq + i * ancho} y={arriba} width={ancho} height={alto + abajo}
                                fill="transparent"
                                onMouseEnter={() => setActivo(i)}
                                onMouseLeave={() => setActivo(null)}
                                onClick={() => setActivo(activo === i ? null : i)}
                            />
                            {(puntos.length <= 13 || i % 2 === 0) && (
                                <text x={izq + i * ancho + ancho / 2} y={H - 8} textAnchor="middle" className="pointer-events-none fill-muted-foreground" fontSize={11}>
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
                    <p className="font-mono tabular-nums">{etiqueta}: {formato(p.valor)}</p>
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
