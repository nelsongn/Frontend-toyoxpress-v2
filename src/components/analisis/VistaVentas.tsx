"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarrasMes } from "./BarrasMes";
import { BarraCelda, EstadoCarga, FilaKpis, FranjaDetalle, Kpi, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { diasDelMes, fecha, mesLargo, num, pct, usd, variacion } from "./formato";

interface Resumen { venta: number; margen: number; descuento: number; facturas: number; clientes: number; productos: number }
interface Datos {
    periodo: { desde: string; hasta: string; desdeAnterior: string; hastaAnterior: string; fechaDatos: string };
    resumen: Resumen;
    resumenAnterior: Resumen;
    mensual: { mes: string; venta: number; margen: number; descuento: number; facturas: number }[];
    clientes: { nombre: string; rif: string; venta: number; margen: number; facturas: number; ultima_compra: string }[];
    vendedores: { nombre: string; venta: number; margen: number; clientes: number; facturas: number }[];
    familias: { nombre: string; venta: number; margen: number; productos: number }[];
    productos: { codigo: string; nombre: string; unidades: number; venta: number; margen: number; clientes: number }[];
}

type Rango = { desde: string; hasta: string };

const boton = (activo: boolean) =>
    cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        activo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
    );
const campoFecha = "rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark]";

export function VistaVentas() {
    // null = últimos 12 meses hasta la última factura cargada
    const [rango, setRango] = useState<Rango | null>(null);
    const [borrador, setBorrador] = useState<Rango>({ desde: "", hasta: "" });
    // Mes elegido en el gráfico: cambia todo lo que está debajo
    const [mes, setMes] = useState<string | null>(null);

    const { datos, error, cargando } = useAnalitica<Datos>(rango ? `ventas?desde=${rango.desde}&hasta=${rango.hasta}` : "ventas");
    const rangoMes = mes && datos ? diasDelMes(mes, datos.periodo.desde, datos.periodo.hasta) : null;
    const detalleMes = useAnalitica<Datos>(rangoMes ? `ventas?desde=${rangoMes.desde}&hasta=${rangoMes.hasta}` : null);

    const desdeInput = borrador.desde || datos?.periodo.desde || "";
    const hastaInput = borrador.hasta || datos?.periodo.hasta || "";
    const rangoValido = !!desdeInput && !!hastaInput && desdeInput <= hastaInput;

    const aplicarRango = () => {
        if (!rangoValido) return;
        setRango({ desde: desdeInput, hasta: hastaInput });
        setMes(null);
    };
    const ultimos12 = () => {
        setRango(null);
        setBorrador({ desde: "", hasta: "" });
        setMes(null);
    };

    const filtros = (
        <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={ultimos12} aria-pressed={!rango} className={boton(!rango)}>
                Últimos 12 meses
            </button>
            <form
                className="flex flex-wrap items-center gap-1.5"
                onSubmit={(e) => { e.preventDefault(); aplicarRango(); }}
                aria-label="Rango de fechas"
            >
                <label htmlFor="ventas-desde" className="text-xs text-muted-foreground">Desde</label>
                <input
                    id="ventas-desde" type="date" className={campoFecha} value={desdeInput}
                    onChange={(e) => setBorrador({ desde: e.target.value, hasta: hastaInput })}
                />
                <label htmlFor="ventas-hasta" className="text-xs text-muted-foreground">hasta</label>
                <input
                    id="ventas-hasta" type="date" className={campoFecha} value={hastaInput}
                    onChange={(e) => setBorrador({ desde: desdeInput, hasta: e.target.value })}
                />
                <button type="submit" disabled={!rangoValido} className={cn(boton(!!rango), "disabled:cursor-not-allowed disabled:opacity-50")}>
                    Aplicar
                </button>
            </form>
        </div>
    );

    if (!datos || cargando || error) return <div className="space-y-4">{filtros}<EstadoCarga cargando={cargando} error={error} /></div>;

    const { resumen: r, resumenAnterior: a, periodo: per } = datos;
    const margenPct = r.venta ? r.margen / r.venta : 0;
    const margenPctAnt = a.venta ? a.margen / a.venta : 0;
    const comparacion = `vs ${fecha(per.desdeAnterior)} – ${fecha(per.hastaAnterior)}`;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {filtros}
                <p className="text-xs text-muted-foreground">{fecha(per.desde)} al {fecha(per.hasta)} · {comparacion}</p>
            </div>

            <FilaKpis columnas={5}>
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
                <Kpi
                    titulo="Descuentos otorgados"
                    valor={usd(r.descuento)}
                    cambio={variacion(r.descuento, a.descuento)}
                    menosEsMejor
                    detalle={`${pct(r.venta + r.descuento ? r.descuento / (r.venta + r.descuento) : 0, 1)} de la venta antes del descuento`}
                />
            </FilaKpis>

            <Panel titulo="Venta por mes" detalle="Haz clic en una barra para ver ese mes en las tablas de abajo. Otro clic en la misma barra vuelve a todo el período.">
                <BarrasMes
                    etiqueta="Venta"
                    seleccionado={mes}
                    onSeleccionar={setMes}
                    puntos={datos.mensual.map((m) => ({
                        mes: m.mes,
                        valor: m.venta,
                        detalle: [
                            `Margen ${usd(m.margen)} (${pct(m.venta ? m.margen / m.venta : 0)})`,
                            `Descuentos ${usd(m.descuento)}`,
                            `${num(m.facturas)} facturas`,
                        ],
                    }))}
                />
            </Panel>

            <Detalle
                datos={mes ? detalleMes.datos : datos}
                cargando={!!mes && detalleMes.cargando}
                error={mes ? detalleMes.error : null}
                titulo={mes && rangoMes ? `${mesLargo(mes)} · ${fecha(rangoMes.desde)} al ${fecha(rangoMes.hasta)}` : `Todo el período · ${fecha(per.desde)} al ${fecha(per.hasta)}`}
                onQuitarMes={mes ? () => setMes(null) : undefined}
            />
        </div>
    );
}

/** Todo lo que está debajo del gráfico: cambia al período completo o al mes elegido. */
function Detalle({
    datos, cargando, error, titulo, onQuitarMes,
}: { datos: Datos | null; cargando: boolean; error: string | null; titulo: string; onQuitarMes?: () => void }) {
    const encabezado = (
        <FranjaDetalle
            titulo={titulo}
            resumen={onQuitarMes && datos
                ? `venta ${usd(datos.resumen.venta)} · margen ${pct(datos.resumen.venta ? datos.resumen.margen / datos.resumen.venta : 0)} · descuentos ${usd(datos.resumen.descuento)} · ${num(datos.resumen.facturas)} facturas`
                : undefined}
            onQuitar={onQuitarMes}
        />
    );

    if (!datos || cargando || error) return <div className="space-y-4">{encabezado}<EstadoCarga cargando={cargando} error={error} /></div>;

    const maxCliente = Math.max(...datos.clientes.map((c) => c.venta), 0);
    const maxVendedor = Math.max(...datos.vendedores.map((c) => c.venta), 0);
    const maxFamilia = Math.max(...datos.familias.map((c) => c.venta), 0);

    return (
        <div className="space-y-4">
            {encabezado}

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Mejores clientes" detalle="Los 15 que más compraron.">
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

                <Panel titulo="Repuestos más vendidos" detalle="Los 20 que más venta dejaron.">
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
