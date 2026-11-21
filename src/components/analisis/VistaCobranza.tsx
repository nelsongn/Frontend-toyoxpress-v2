"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarrasMes } from "./BarrasMes";
import { BarraCelda, EstadoCarga, FilaKpis, FranjaDetalle, Kpi, Panel, Tabla, td, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { diasDelMes, fecha, mesLargo, num, pct, usd } from "./formato";

interface Cobros {
    mensual: { mes: string; cobrado: number; pagos: number }[];
    vendedores: { nombre: string; cobrado: number; pagos: number; comision_pct: number | null }[];
    clientes: { nombre: string; rif: string; cobrado: number; pagos: number; ultimo_pago: string }[];
}
interface Datos {
    periodo: { desde: string; hasta: string };
    detalle: { desde: string; hasta: string };
    resumen: { por_cobrar: number; vencido: number; a_favor: number; clientes: number; documentos: number; cobrado_30d: number };
    antiguedad: { tramo: string; saldo: number; documentos: number }[];
    clientes: { nombre: string; rif: string; vendedor: string; saldo: number; vencido: number | null; dias_max: number; documentos: number; limite_credito: number }[];
    cobros: Cobros;
}

export function VistaCobranza() {
    // Mes elegido en el gráfico de cobros: cambia los cobros por vendedor y por cliente
    const [mes, setMes] = useState<string | null>(null);
    const { datos, error, cargando } = useAnalitica<Datos>("cobranza");
    const rangoMes = mes && datos ? diasDelMes(mes, datos.periodo.desde, datos.periodo.hasta) : null;
    const detalleMes = useAnalitica<Datos>(rangoMes ? `cobranza?desde=${rangoMes.desde}&hasta=${rangoMes.hasta}` : null);

    if (!datos || cargando || error) return <EstadoCarga cargando={cargando} error={error} />;

    const { resumen: r } = datos;
    const maxTramo = Math.max(...datos.antiguedad.map((t) => t.saldo), 0);
    const neto = r.por_cobrar - r.a_favor;

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Saldos y vencimientos al {fecha(datos.periodo.hasta)}, la fecha de la última factura cargada.</p>

            <FilaKpis>
                <Kpi titulo="Por cobrar" valor={usd(r.por_cobrar)} detalle={`${num(r.documentos)} documentos de ${num(r.clientes)} clientes`} />
                <Kpi
                    titulo="Vencido"
                    valor={usd(r.vencido)}
                    detalle={`${pct(r.por_cobrar ? r.vencido / r.por_cobrar : 0)} de lo por cobrar`}
                    alerta={r.vencido > r.por_cobrar * 0.5}
                />
                <Kpi titulo="A favor de clientes" valor={usd(r.a_favor)} detalle={`anticipos y notas de crédito · neto ${usd(neto)}`} />
                <Kpi titulo="Cobrado en 30 días" valor={usd(r.cobrado_30d)} />
            </FilaKpis>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Antigüedad de lo por cobrar" detalle="Días desde el vencimiento de cada factura.">
                    <Tabla>
                        <thead><tr><th className={th}>Tramo</th><th className={thNum}>Saldo</th><th className={thNum}>Documentos</th></tr></thead>
                        <tbody>
                            {datos.antiguedad.map((t) => (
                                <tr key={t.tramo}>
                                    <td className={cn(td, t.tramo === "Más de 90 días" && "font-semibold text-red-600 dark:text-red-400")}>{t.tramo}</td>
                                    <td className={tdNum}><BarraCelda valor={t.saldo} maximo={maxTramo} texto={usd(t.saldo)} tono={t.tramo === "Por vencer" ? "primary" : "rojo"} /></td>
                                    <td className={tdNum}>{num(t.documentos)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>

                <Panel titulo="Clientes con saldo pendiente" detalle="Los 25 con más saldo. En rojo, deudas con más de 30 días de vencidas.">
                    <Tabla>
                        <thead><tr><th className={th}>Cliente</th><th className={thNum}>Saldo</th><th className={thNum}>Vencido</th><th className={thNum}>Días máx.</th><th className={thNum}>Límite</th></tr></thead>
                        <tbody>
                            {datos.clientes.map((c) => (
                                <tr key={c.rif}>
                                    <td className={td}>
                                        <span className="font-medium">{c.nombre}</span>
                                        <span className="block text-xs text-muted-foreground"><span className="font-mono">{c.rif}</span> · {c.vendedor} · {num(c.documentos)} docs.</span>
                                    </td>
                                    <td className={tdNum}>{usd(c.saldo)}</td>
                                    <td className={cn(tdNum, (c.vencido ?? 0) > 0 && "text-red-600 dark:text-red-400")}>{usd(c.vencido ?? 0)}</td>
                                    <td className={cn(tdNum, c.dias_max > 30 && "font-semibold text-red-600 dark:text-red-400")}>{c.dias_max > 0 ? num(c.dias_max) : "al día"}</td>
                                    <td className={tdNum}>{c.limite_credito ? usd(c.limite_credito) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>

            <Panel titulo="Cobros por mes" detalle="Pagos de clientes registrados en cuentas por cobrar. Haz clic en una barra para ver ese mes en las tablas de abajo.">
                <BarrasMes
                    etiqueta="Cobrado"
                    seleccionado={mes}
                    onSeleccionar={setMes}
                    puntos={datos.cobros.mensual.map((m) => ({ mes: m.mes, valor: m.cobrado, detalle: [`${num(m.pagos)} pagos`] }))}
                />
            </Panel>

            <DetalleCobros
                cobros={mes ? detalleMes.datos?.cobros ?? null : datos.cobros}
                cargando={!!mes && detalleMes.cargando}
                error={mes ? detalleMes.error : null}
                titulo={mes && rangoMes ? `${mesLargo(mes)} · ${fecha(rangoMes.desde)} al ${fecha(rangoMes.hasta)}` : `Últimos 12 meses · ${fecha(datos.periodo.desde)} al ${fecha(datos.periodo.hasta)}`}
                onQuitarMes={mes ? () => setMes(null) : undefined}
            />
        </div>
    );
}

function DetalleCobros({
    cobros, cargando, error, titulo, onQuitarMes,
}: { cobros: Cobros | null; cargando: boolean; error: string | null; titulo: string; onQuitarMes?: () => void }) {
    const total = cobros?.vendedores.reduce((s, v) => s + v.cobrado, 0) ?? 0;
    const pagos = cobros?.vendedores.reduce((s, v) => s + v.pagos, 0) ?? 0;
    const encabezado = (
        <FranjaDetalle titulo={titulo} resumen={onQuitarMes && cobros ? `cobrado ${usd(total)} · ${num(pagos)} pagos` : undefined} onQuitar={onQuitarMes} />
    );
    if (!cobros || cargando || error) return <div className="space-y-4">{encabezado}<EstadoCarga cargando={cargando} error={error} /></div>;

    const maxVendedor = Math.max(...cobros.vendedores.map((v) => v.cobrado), 0);
    const maxCliente = Math.max(...cobros.clientes.map((c) => c.cobrado), 0);

    return (
        <div className="space-y-4">
            {encabezado}
            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Cobrado por vendedor" detalle="La comisión se calcula con la regla de cobranza de cada vendedor.">
                    <Tabla>
                        <thead><tr><th className={th}>Vendedor</th><th className={thNum}>Cobrado</th><th className={thNum}>Pagos</th><th className={thNum}>Comisión</th></tr></thead>
                        <tbody>
                            {cobros.vendedores.map((v) => (
                                <tr key={v.nombre}>
                                    <td className={cn(td, "font-medium")}>{v.nombre}</td>
                                    <td className={tdNum}><BarraCelda valor={v.cobrado} maximo={maxVendedor} texto={usd(v.cobrado)} /></td>
                                    <td className={tdNum}>{num(v.pagos)}</td>
                                    <td className={tdNum}>{v.comision_pct ? `${usd((v.cobrado * v.comision_pct) / 100)} (${num(v.comision_pct)} %)` : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>

                <Panel titulo="Clientes que más pagaron" detalle="Los 15 con más pagos registrados.">
                    <Tabla>
                        <thead><tr><th className={th}>Cliente</th><th className={thNum}>Pagado</th><th className={thNum}>Pagos</th><th className={thNum}>Último</th></tr></thead>
                        <tbody>
                            {cobros.clientes.map((c) => (
                                <tr key={c.rif}>
                                    <td className={td}><span className="font-medium">{c.nombre}</span><span className="block font-mono text-xs text-muted-foreground">{c.rif}</span></td>
                                    <td className={tdNum}><BarraCelda valor={c.cobrado} maximo={maxCliente} texto={usd(c.cobrado)} /></td>
                                    <td className={tdNum}>{num(c.pagos)}</td>
                                    <td className={cn(tdNum, "whitespace-nowrap text-xs")}>{fecha(c.ultimo_pago)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>
        </div>
    );
}
