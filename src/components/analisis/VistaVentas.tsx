"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarrasMes } from "./BarrasMes";
import { BarraCelda, EstadoCarga, FilaKpis, Kpi, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, pct, usd, variacion } from "./formato";

interface Resumen { venta: number; margen: number; facturas: number; clientes: number; productos: number }
interface Datos {
    periodo: { desde: string; hasta: string; desdeAnterior: string; hastaAnterior: string; fechaDatos: string };
    resumen: Resumen;
    resumenAnterior: Resumen;
    mensual: { mes: string; venta: number; margen: number; facturas: number }[];
    clientes: { nombre: string; rif: string; venta: number; margen: number; facturas: number; ultima_compra: string }[];
    vendedores: { nombre: string; venta: number; margen: number; clientes: number; facturas: number }[];
    familias: { nombre: string; venta: number; margen: number; productos: number }[];
    productos: { codigo: string; nombre: string; unidades: number; venta: number; margen: number; clientes: number }[];
}

const PERIODOS = [
    { id: "12m", nombre: "Últimos 12 meses" },
    { id: "2026", nombre: "2026" },
    { id: "2025", nombre: "2025" },
    { id: "2024", nombre: "2024" },
] as const;

function rutaPara(periodo: string): string {
    if (periodo === "12m") return "ventas";
    return `ventas?desde=${periodo}-01-01&hasta=${periodo}-12-31`;
}

export function VistaVentas() {
    const [periodo, setPeriodo] = useState<string>("12m");
    const { datos, error, cargando } = useAnalitica<Datos>(rutaPara(periodo));

    const selector = (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodo(p.id)}
                    aria-pressed={periodo === p.id}
                    className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        periodo === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                >
                    {p.nombre}
                </button>
            ))}
        </div>
    );

    if (!datos || cargando || error) return <div className="space-y-4">{selector}<EstadoCarga cargando={cargando} error={error} /></div>;

    const { resumen: r, resumenAnterior: a, periodo: per } = datos;
    const margenPct = r.venta ? r.margen / r.venta : 0;
    const margenPctAnt = a.venta ? a.margen / a.venta : 0;
    const maxCliente = Math.max(...datos.clientes.map((c) => c.venta), 0);
    const maxVendedor = Math.max(...datos.vendedores.map((c) => c.venta), 0);
    const maxFamilia = Math.max(...datos.familias.map((c) => c.venta), 0);
    const comparacion = `vs ${fecha(per.desdeAnterior)} – ${fecha(per.hastaAnterior)}`;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {selector}
                <p className="text-xs text-muted-foreground">{fecha(per.desde)} al {fecha(per.hasta)} · {comparacion}</p>
            </div>

            <FilaKpis>
                <Kpi titulo="Venta neta" valor={usd(r.venta)} cambio={variacion(r.venta, a.venta)} detalle={`${num(r.facturas)} facturas`} />
                <Kpi
                    titulo="Margen bruto"
                    valor={pct(margenPct, 1)}
                    detalle={`${usd(r.margen)} · antes ${pct(margenPctAnt, 1)}`}
                />
                <Kpi titulo="Clientes que compraron" valor={num(r.clientes)} cambio={variacion(r.clientes, a.clientes)} />
                <Kpi
                    titulo="Ticket promedio"
                    valor={usd(r.facturas ? r.venta / r.facturas : 0)}
                    cambio={variacion(r.facturas ? r.venta / r.facturas : 0, a.facturas ? a.venta / a.facturas : 0)}
                    detalle={`${num(r.productos)} repuestos distintos`}
                />
            </FilaKpis>

            <Panel titulo="Venta por mes" detalle="Pasa el mouse o toca una barra para ver el margen y las facturas.">
                <BarrasMes
                    etiqueta="Venta"
                    puntos={datos.mensual.map((m) => ({
                        mes: m.mes,
                        valor: m.venta,
                        detalle: [`Margen ${usd(m.margen)} (${pct(m.venta ? m.margen / m.venta : 0)})`, `${num(m.facturas)} facturas`],
                    }))}
                />
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Mejores clientes" detalle="Los 15 que más compraron en el período.">
                    <Tabla>
                        <thead><tr><th className={th}>Cliente</th><th className={thNum}>Venta</th><th className={thNum}>Margen</th><th className={thNum}>Facturas</th><th className={thNum}>Última</th></tr></thead>
                        <tbody>
                            {datos.clientes.map((c) => (
                                <tr key={c.rif}>
                                    <td className={td}><span className="font-medium">{c.nombre}</span><span className="block font-mono text-xs text-muted-foreground">{c.rif}</span></td>
                                    <td className={tdNum}><BarraCelda valor={c.venta} maximo={maxCliente} texto={usd(c.venta)} /></td>
                                    <td className={tdNum}>{pct(c.venta ? c.margen / c.venta : 0)}</td>
                                    <td className={tdNum}>{num(c.facturas)}</td>
                                    <td className={cn(tdNum, "whitespace-nowrap text-xs")}>{fecha(c.ultima_compra)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>

                <Panel titulo="Por vendedor">
                    <Tabla>
                        <thead><tr><th className={th}>Vendedor</th><th className={thNum}>Venta</th><th className={thNum}>Margen</th><th className={thNum}>Clientes</th><th className={thNum}>Facturas</th></tr></thead>
                        <tbody>
                            {datos.vendedores.map((v) => (
                                <tr key={v.nombre}>
                                    <td className={cn(td, "font-medium")}>{v.nombre}</td>
                                    <td className={tdNum}><BarraCelda valor={v.venta} maximo={maxVendedor} texto={usd(v.venta)} /></td>
                                    <td className={tdNum}>{pct(v.venta ? v.margen / v.venta : 0)}</td>
                                    <td className={tdNum}>{num(v.clientes)}</td>
                                    <td className={tdNum}>{num(v.facturas)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Por familia de repuestos">
                    <Tabla>
                        <thead><tr><th className={th}>Familia</th><th className={thNum}>Venta</th><th className={thNum}>Margen</th><th className={thNum}>Repuestos</th></tr></thead>
                        <tbody>
                            {datos.familias.map((f) => (
                                <tr key={f.nombre}>
                                    <td className={td}>{f.nombre}</td>
                                    <td className={tdNum}><BarraCelda valor={f.venta} maximo={maxFamilia} texto={usd(f.venta)} /></td>
                                    <td className={tdNum}>{pct(f.venta ? f.margen / f.venta : 0)}</td>
                                    <td className={tdNum}>{num(f.productos)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>

                <Panel titulo="Repuestos más vendidos" detalle="Los 20 que más venta dejaron en el período.">
                    <Tabla>
                        <thead><tr><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Unidades</th><th className={thNum}>Venta</th><th className={thNum}>Margen</th></tr></thead>
                        <tbody>
                            {datos.productos.map((p) => (
                                <tr key={p.codigo}>
                                    <td className={tdCodigo}>{p.codigo}</td>
                                    <td className={cn(td, "min-w-[220px]")}>{p.nombre}</td>
                                    <td className={tdNum}>{num(p.unidades)}</td>
                                    <td className={tdNum}>{usd(p.venta)}</td>
                                    <td className={tdNum}>{pct(p.venta ? p.margen / p.venta : 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>
        </div>
    );
}
