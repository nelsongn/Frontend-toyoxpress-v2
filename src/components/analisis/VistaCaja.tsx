"use client";

import { cn } from "@/lib/utils";
import { BarrasMes } from "./BarrasMes";
import { BarraCelda, EstadoCarga, FilaKpis, Kpi, Panel, Tabla, td, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, pct, usd, usdExacto } from "./formato";

interface Datos {
    periodo: { desde: string; hasta: string };
    caja: {
        mensual: { mes: string; cobrado: number | null; egresos: number | null; recibos: number }[];
        formas: { forma: string; total: number; recibos: number }[];
        egresos: { concepto: string; total: number; veces: number }[];
    };
    bancos: {
        cuentas: { nombre: string; banco: string | null; activa: boolean; saldo: number; entradas_12m: number; salidas_12m: number; ultimo_movimiento: string | null }[];
        mensual: { mes: string; entradas: number; salidas: number }[];
        ultimos: { fecha: string; cuenta: string; tipo: string; numero: string | null; descripcion: string | null; beneficiario: string | null; debito: number; credito: number }[];
    };
}

const FORMAS: Record<string, string> = {
    efectivo: "Efectivo", divisas: "Divisas", transferencia: "Transferencia", deposito: "Depósito",
    tarjeta_debito: "Tarjeta de débito", tarjeta_credito: "Tarjeta de crédito", cheque: "Cheque",
    efectivo_ba: "Efectivo (Bs)", retencion: "Retención", anticipo: "Anticipo aplicado", nota_credito: "Nota de crédito",
};
const TIPOS_BANCO: Record<string, string> = { DEP: "Depósito", NDB: "Nota de débito", NCR: "Nota de crédito", TRF: "Transferencia", CHQ: "Cheque" };

export function VistaCaja() {
    const { datos, error, cargando } = useAnalitica<Datos>("caja");
    if (!datos || cargando || error) return <EstadoCarga cargando={cargando} error={error} />;

    const cobrado = datos.caja.mensual.reduce((s, m) => s + (m.cobrado ?? 0), 0);
    const egresos = datos.caja.mensual.reduce((s, m) => s + (m.egresos ?? 0), 0);
    const recibos = datos.caja.mensual.reduce((s, m) => s + m.recibos, 0);
    const saldoBancos = datos.bancos.cuentas.reduce((s, c) => s + c.saldo, 0);
    const totalFormas = datos.caja.formas.reduce((s, f) => s + f.total, 0) || 1;
    const maxEgreso = Math.max(...datos.caja.egresos.map((e) => e.total), 0);

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Caja y bancos de Valery, de {fecha(datos.periodo.desde)} al {fecha(datos.periodo.hasta)}. La caja chica de la app está en el Dashboard y en Movimientos.</p>

            <FilaKpis>
                <Kpi titulo="Cobrado en caja" valor={usd(cobrado)} detalle={`${num(recibos)} recibos en 12 meses`} />
                <Kpi titulo="Egresos de caja" valor={usd(egresos)} detalle="retiros y depósitos a bancos" />
                <Kpi titulo="Saldo en bancos" valor={usd(saldoBancos)} detalle={`${num(datos.bancos.cuentas.length)} cuentas`} alerta={saldoBancos < 0} />
                <Kpi
                    titulo="Movido en bancos"
                    valor={usd(datos.bancos.cuentas.reduce((s, c) => s + c.entradas_12m, 0))}
                    detalle="entradas en 12 meses"
                />
            </FilaKpis>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Cobrado en caja por mes">
                    <BarrasMes
                        etiqueta="Cobrado"
                        puntos={datos.caja.mensual.map((m) => ({
                            mes: m.mes, valor: m.cobrado ?? 0,
                            detalle: [`${num(m.recibos)} recibos`, `Egresos ${usd(m.egresos ?? 0)}`],
                        }))}
                    />
                </Panel>
                <Panel titulo="Cómo pagan los clientes" detalle="Recibos de caja de los últimos 12 meses, por forma de pago.">
                    <Tabla>
                        <thead><tr><th className={th}>Forma de pago</th><th className={thNum}>Monto</th><th className={thNum}>%</th><th className={thNum}>Recibos</th></tr></thead>
                        <tbody>
                            {datos.caja.formas.map((f) => (
                                <tr key={f.forma}>
                                    <td className={td}>{FORMAS[f.forma] ?? f.forma}</td>
                                    <td className={tdNum}><BarraCelda valor={f.total} maximo={totalFormas} texto={usd(f.total)} /></td>
                                    <td className={tdNum}>{pct(f.total / totalFormas)}</td>
                                    <td className={tdNum}>{num(f.recibos)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Cuentas bancarias" detalle="Saldo según Valery: entradas menos salidas desde la apertura.">
                    <Tabla>
                        <thead><tr><th className={th}>Cuenta</th><th className={thNum}>Saldo</th><th className={thNum}>Entradas 12 m</th><th className={thNum}>Salidas 12 m</th><th className={thNum}>Último mov.</th></tr></thead>
                        <tbody>
                            {datos.bancos.cuentas.map((c) => (
                                <tr key={c.nombre}>
                                    <td className={td}><span className="font-medium">{c.nombre}</span>{c.banco && c.banco !== c.nombre && <span className="block text-xs text-muted-foreground">{c.banco}</span>}</td>
                                    <td className={cn(tdNum, "font-semibold", c.saldo < 0 && "text-red-600 dark:text-red-400")}>{usdExacto(c.saldo)}</td>
                                    <td className={tdNum}>{usd(c.entradas_12m)}</td>
                                    <td className={tdNum}>{usd(c.salidas_12m)}</td>
                                    <td className={cn(tdNum, "whitespace-nowrap text-xs")}>{fecha(c.ultimo_movimiento)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
                <Panel titulo="Principales egresos de caja">
                    <Tabla>
                        <thead><tr><th className={th}>Concepto</th><th className={thNum}>Monto</th><th className={thNum}>Veces</th></tr></thead>
                        <tbody>
                            {datos.caja.egresos.map((e) => (
                                <tr key={e.concepto}>
                                    <td className={cn(td, "min-w-[200px]")}>{e.concepto}</td>
                                    <td className={tdNum}><BarraCelda valor={e.total} maximo={maxEgreso} texto={usd(e.total)} /></td>
                                    <td className={tdNum}>{num(e.veces)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>

            <Panel titulo="Entradas a bancos por mes">
                <BarrasMes
                    etiqueta="Entradas"
                    puntos={datos.bancos.mensual.map((m) => ({ mes: m.mes, valor: m.entradas, detalle: [`Salidas ${usd(m.salidas)}`] }))}
                />
            </Panel>

            <Panel titulo="Últimos movimientos bancarios">
                <Tabla>
                    <thead><tr><th className={th}>Fecha</th><th className={th}>Cuenta</th><th className={th}>Tipo</th><th className={th}>Descripción</th><th className={thNum}>Entrada</th><th className={thNum}>Salida</th></tr></thead>
                    <tbody>
                        {datos.bancos.ultimos.map((m, i) => (
                            <tr key={`${m.fecha}-${m.numero}-${i}`}>
                                <td className={cn(td, "whitespace-nowrap text-xs")}>{fecha(m.fecha)}</td>
                                <td className={cn(td, "text-xs")}>{m.cuenta}</td>
                                <td className={cn(td, "text-xs")}>{TIPOS_BANCO[m.tipo] ?? m.tipo}</td>
                                <td className={cn(td, "min-w-[220px] text-xs")}>{m.descripcion ?? "—"}{m.beneficiario && <span className="block text-muted-foreground">{m.beneficiario}</span>}</td>
                                <td className={tdNum}>{m.debito ? usdExacto(m.debito) : ""}</td>
                                <td className={tdNum}>{m.credito ? usdExacto(m.credito) : ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </Tabla>
            </Panel>
        </div>
    );
}
