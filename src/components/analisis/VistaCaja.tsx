"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarrasMes } from "./BarrasMes";
import { BarraCelda, EstadoCarga, FilaKpis, FranjaDetalle, Kpi, Panel, Tabla, td, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { diasDelMes, fecha, mesLargo, num, pct, usd, usdExacto } from "./formato";

interface Datos {
    periodo: { desde: string; hasta: string };
    detalle: {
        desde: string; hasta: string; cobrado: number; egresos: number; recibos: number;
        entradas_banco: number; salidas_banco: number; movimientos_banco: number;
    };
    caja: {
        mensual: { mes: string; cobrado: number | null; egresos: number | null; recibos: number }[];
        formas: { forma: string; total: number; recibos: number }[];
        egresos: { concepto: string; total: number; veces: number }[];
    };
    bancos: {
        cuentas: { nombre: string; banco: string | null; activa: boolean; saldo: number; entradas: number; salidas: number; ultimo_movimiento: string | null }[];
        mensual: { mes: string; entradas: number; salidas: number }[];
        movimientos: { fecha: string; cuenta: string; tipo: string; numero: string | null; descripcion: string | null; beneficiario: string | null; debito: number; credito: number }[];
    };
}

const FORMAS: Record<string, string> = {
    efectivo: "Efectivo", divisas: "Divisas", transferencia: "Transferencia", deposito: "Depósito",
    tarjeta_debito: "Tarjeta de débito", tarjeta_credito: "Tarjeta de crédito", cheque: "Cheque",
    efectivo_ba: "Efectivo (Bs)", retencion: "Retención", anticipo: "Anticipo aplicado", nota_credito: "Nota de crédito",
};
const TIPOS_BANCO: Record<string, string> = { DEP: "Depósito", NDB: "Nota de débito", NCR: "Nota de crédito", TRF: "Transferencia", CHQ: "Cheque" };

export function VistaCaja() {
    // Un mes elegido en cualquiera de los dos gráficos cambia todo lo de abajo
    const [mes, setMes] = useState<string | null>(null);
    const { datos, error, cargando } = useAnalitica<Datos>("caja");
    const rangoMes = mes && datos ? diasDelMes(mes, datos.periodo.desde, datos.periodo.hasta) : null;
    const detalleMes = useAnalitica<Datos>(rangoMes ? `caja?desde=${rangoMes.desde}&hasta=${rangoMes.hasta}` : null);

    if (!datos || cargando || error) return <EstadoCarga cargando={cargando} error={error} />;

    const d12 = datos.detalle;
    const saldoBancos = datos.bancos.cuentas.reduce((s, c) => s + c.saldo, 0);

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Caja y bancos de Valery, de {fecha(datos.periodo.desde)} al {fecha(datos.periodo.hasta)}. La caja chica de la app está en el Dashboard y en Movimientos.</p>

            <FilaKpis>
                <Kpi titulo="Cobrado en caja" valor={usd(d12.cobrado)} detalle={`${num(d12.recibos)} recibos en 12 meses`} />
                <Kpi titulo="Egresos de caja" valor={usd(d12.egresos)} detalle="retiros y depósitos a bancos" />
                <Kpi titulo="Saldo en bancos" valor={usd(saldoBancos)} detalle={`${num(datos.bancos.cuentas.length)} cuentas`} alerta={saldoBancos < 0} />
                <Kpi titulo="Entradas a bancos" valor={usd(d12.entradas_banco)} detalle="en 12 meses" />
            </FilaKpis>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Cobrado en caja por mes" detalle="Haz clic en una barra para ver ese mes abajo.">
                    <BarrasMes
                        etiqueta="Cobrado"
                        seleccionado={mes}
                        onSeleccionar={setMes}
                        puntos={datos.caja.mensual.map((m) => ({
                            mes: m.mes, valor: m.cobrado ?? 0,
                            detalle: [`${num(m.recibos)} recibos`, `Egresos ${usd(m.egresos ?? 0)}`],
                        }))}
                    />
                </Panel>
                <Panel titulo="Entradas a bancos por mes" detalle="Haz clic en una barra para ver ese mes abajo.">
                    <BarrasMes
                        etiqueta="Entradas"
                        seleccionado={mes}
                        onSeleccionar={setMes}
                        puntos={datos.bancos.mensual.map((m) => ({ mes: m.mes, valor: m.entradas, detalle: [`Salidas ${usd(m.salidas)}`] }))}
                    />
                </Panel>
            </div>

            <Detalle
                datos={mes ? detalleMes.datos : datos}
                cargando={!!mes && detalleMes.cargando}
                error={mes ? detalleMes.error : null}
                titulo={mes && rangoMes ? `${mesLargo(mes)} · ${fecha(rangoMes.desde)} al ${fecha(rangoMes.hasta)}` : `Últimos 12 meses · ${fecha(datos.periodo.desde)} al ${fecha(datos.periodo.hasta)}`}
                onQuitarMes={mes ? () => setMes(null) : undefined}
            />
        </div>
    );
}

/** Todo lo que está debajo de los gráficos: cambia a los 12 meses o al mes elegido. */
function Detalle({
    datos, cargando, error, titulo, onQuitarMes,
}: { datos: Datos | null; cargando: boolean; error: string | null; titulo: string; onQuitarMes?: () => void }) {
    const d = datos?.detalle;
    const encabezado = (
        <FranjaDetalle
            titulo={titulo}
            resumen={onQuitarMes && d
                ? `caja ${usd(d.cobrado)} en ${num(d.recibos)} recibos · egresos ${usd(d.egresos)} · bancos +${usd(d.entradas_banco)} / −${usd(d.salidas_banco)}`
                : undefined}
            onQuitar={onQuitarMes}
        />
    );
    if (!datos || !d || cargando || error) return <div className="space-y-4">{encabezado}<EstadoCarga cargando={cargando} error={error} /></div>;

    const totalFormas = datos.caja.formas.reduce((s, f) => s + f.total, 0) || 1;
    const maxEgreso = Math.max(...datos.caja.egresos.map((e) => e.total), 0);

    return (
        <div className="space-y-4">
            {encabezado}

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Cómo pagan los clientes" detalle="Recibos de caja por forma de pago.">
                    {datos.caja.formas.length === 0 ? <p className="text-sm text-muted-foreground">Sin recibos en el período.</p> : (
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
                    )}
                </Panel>
                <Panel titulo="Principales egresos de caja">
                    {datos.caja.egresos.length === 0 ? <p className="text-sm text-muted-foreground">Sin egresos en el período.</p> : (
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
                    )}
                </Panel>
            </div>

            <Panel titulo="Cuentas bancarias" detalle="El saldo es el total desde la apertura; entradas y salidas son las del período mostrado.">
                <Tabla>
                    <thead><tr><th className={th}>Cuenta</th><th className={thNum}>Saldo actual</th><th className={thNum}>Entradas</th><th className={thNum}>Salidas</th><th className={thNum}>Último mov.</th></tr></thead>
                    <tbody>
                        {datos.bancos.cuentas.map((c) => (
                            <tr key={c.nombre}>
                                <td className={td}><span className="font-medium">{c.nombre}</span>{c.banco && c.banco !== c.nombre && <span className="block text-xs text-muted-foreground">{c.banco}</span>}</td>
                                <td className={cn(tdNum, "font-semibold", c.saldo < 0 && "text-red-600 dark:text-red-400")}>{usdExacto(c.saldo)}</td>
                                <td className={tdNum}>{usd(c.entradas)}</td>
                                <td className={tdNum}>{usd(c.salidas)}</td>
                                <td className={cn(tdNum, "whitespace-nowrap text-xs")}>{fecha(c.ultimo_movimiento)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Tabla>
            </Panel>

            <Panel
                titulo="Movimientos bancarios"
                detalle={d.movimientos_banco > datos.bancos.movimientos.length
                    ? `Los ${num(datos.bancos.movimientos.length)} más recientes de ${num(d.movimientos_banco)}.`
                    : `${num(d.movimientos_banco)} movimientos.`}
            >
                <Tabla>
                    <thead><tr><th className={th}>Fecha</th><th className={th}>Cuenta</th><th className={th}>Tipo</th><th className={th}>Descripción</th><th className={thNum}>Entrada</th><th className={thNum}>Salida</th></tr></thead>
                    <tbody>
                        {datos.bancos.movimientos.map((m, i) => (
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
