"use client";

import { Fragment, useEffect, useState } from "react";
import { Download, Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EstadoCarga, FilaKpis, Kpi, mensajeError, Panel, Tabla, td, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, usd } from "./formato";

interface ClienteEncontrado { id: number; nombre: string; rif: string; vendedor: string; saldo: number; vencido: number }

/** Busca clientes por nombre, RIF o código mientras se escribe. */
export function BuscarCliente({ onElegir }: { onElegir: (c: ClienteEncontrado) => void }) {
    const [texto, setTexto] = useState("");
    const [resultado, setResultado] = useState<{ texto: string; clientes: ClienteEncontrado[]; error: string | null } | null>(null);
    const [abierto, setAbierto] = useState(false);
    const consulta = texto.trim();

    useEffect(() => {
        if (consulta.length < 2) return;
        let vigente = true;
        const t = setTimeout(() => {
            api.get("/analitica/clientes", { params: { q: consulta } })
                .then((r) => vigente && setResultado({ texto: consulta, clientes: r.data.clientes, error: null }))
                .catch((e) => vigente && setResultado({ texto: consulta, clientes: [], error: mensajeError(e, "No se pudo buscar.") }));
        }, 300);
        return () => { vigente = false; clearTimeout(t); };
    }, [consulta]);

    const listo = resultado?.texto === consulta;
    return (
        <div className="relative">
            <span className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    aria-label="Buscar cliente"
                    value={texto}
                    onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
                    onFocus={() => setAbierto(true)}
                    placeholder="Nombre, RIF o código del cliente"
                    className="w-full rounded-md border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground"
                />
            </span>
            {abierto && consulta.length >= 2 && (
                <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
                    {!listo ? (
                        <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</p>
                    ) : resultado.error ? (
                        <p className="px-3 py-2 text-sm text-red-600 dark:text-red-400">{resultado.error}</p>
                    ) : !resultado.clientes.length ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Ningún cliente coincide con “{consulta}”.</p>
                    ) : (
                        resultado.clientes.map((c) => (
                            <button
                                key={c.id} type="button"
                                onClick={() => { onElegir(c); setTexto(c.nombre); setAbierto(false); }}
                                className="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                            >
                                <span>
                                    <span className="font-medium">{c.nombre}</span>
                                    <span className="block text-xs text-muted-foreground"><span className="font-mono">{c.rif}</span> · {c.vendedor}</span>
                                </span>
                                <span className="whitespace-nowrap text-right font-mono text-xs">
                                    {c.saldo > 0 ? usd(c.saldo) : <span className="text-muted-foreground">sin deuda</span>}
                                    {c.vencido > 0 && <span className="block text-red-600 dark:text-red-400">{usd(c.vencido)} vencido</span>}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

/** Pago o nota de crédito aplicado en parte a un documento: monto es lo aplicado, total lo que fue el pago. */
interface Abono { tipo: string; etiqueta: string; numero: string; fecha: string; monto: number; total: number }
interface Documento { tipo: string; etiqueta: string; numero: string; emision: string; vencimiento?: string | null; monto: number; saldo: number; dias_vencido?: number; abonos?: Abono[] }
interface Estado {
    datosAl: string;
    cliente: {
        id: number; nombre: string; rif: string; contacto: string | null; telefonos: string | null; correo: string | null;
        direccion: string | null; estado: string | null; vendedor: string; tipoPrecio: string | null; limiteCredito: number;
        diasCredito: number; activo: boolean; notas: string | null; clienteDesde: string | null;
    };
    resumen: {
        saldo: number; vencido: number; porVencer: number; aFavor: number; neto: number; creditoDisponible: number | null;
        compras12: number; facturas12: number; ultima_compra: string | null; ultimo_pago: string | null;
    };
    pendientes: Documento[];
    aFavor: Documento[];
}

/** Datos del cliente, saldo y documentos pendientes. */
export function EstadoCuenta({ clienteId, hasta, onCerrar }: { clienteId: number; hasta: string; onCerrar: () => void }) {
    // Los movimientos no se muestran: se piden solo los de hoy para no traer datos de más
    const { datos, error, cargando } = useAnalitica<Estado>(`clientes/${clienteId}/estado-cuenta?desde=${hasta}&hasta=${hasta}`, { conservar: true });

    if (!datos) return <EstadoCarga cargando={cargando} error={error} />;
    const c = datos.cliente;
    const r = datos.resumen;

    const exportar = async () => {
        const XLSX = await import("xlsx");
        const libro = XLSX.utils.book_new();
        const pend = XLSX.utils.json_to_sheet(datos.pendientes.flatMap((p) => [{
            Documento: `${p.etiqueta} ${p.numero}`, Emisión: p.emision, Vence: p.vencimiento ?? "",
            "Días vencido": (p.dias_vencido ?? 0) > 0 ? p.dias_vencido : "", Monto: p.monto, Saldo: p.saldo,
        }, ...(p.abonos ?? []).map((a) => ({
            Documento: `   ${a.etiqueta} ${a.numero}`, Emisión: a.fecha, Vence: "", "Días vencido": "", Monto: -a.monto, Saldo: "",
        }))]));
        XLSX.utils.sheet_add_aoa(pend, [[], ["Saldo total", "", "", "", "", r.saldo], ["A favor", "", "", "", "", -r.aFavor], ["Neto", "", "", "", "", r.neto]], { origin: -1 });
        XLSX.utils.book_append_sheet(libro, pend, "Pendiente");
        XLSX.writeFile(libro, `Estado_de_cuenta_${c.rif.replace(/[^\w-]+/g, "")}_${datos.datosAl}.xlsx`);
    };

    const dato = (etiqueta: string, valor: React.ReactNode) => valor ? (
        <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{etiqueta}</dt><dd className="truncate text-sm">{valor}</dd></div>
    ) : null;

    return (
        <div className="space-y-4">
            <Panel
                titulo="Estado de cuenta"
                detalle={`Saldos a la fecha de los datos de Valery (${fecha(datos.datosAl)}).`}
                accion={
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={exportar} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Download className="h-3.5 w-3.5" /> Excel</button>
                        <button type="button" onClick={onCerrar} aria-label="Cerrar estado de cuenta" className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-lg font-semibold">{c.nombre}{!c.activo && <span className="ml-2 text-xs font-normal text-muted-foreground">(inactivo)</span>}</p>
                        <p className="text-sm text-muted-foreground"><span className="font-mono">{c.rif}</span> · Vendedor: {c.vendedor}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {dato("Contacto", c.contacto)}
                        {dato("Teléfonos", c.telefonos)}
                        {dato("Correo", c.correo)}
                        {dato("Estado", c.estado)}
                        {dato("Crédito", c.limiteCredito > 0 || c.diasCredito > 0 ? `${c.limiteCredito > 0 ? usd(c.limiteCredito) : "sin límite"} · ${num(c.diasCredito)} días` : "De contado")}
                        {dato("Precio", c.tipoPrecio)}
                        {dato("Cliente desde", c.clienteDesde ? fecha(c.clienteDesde) : null)}
                        {dato("Notas", c.notas)}
                    </dl>
                    {c.direccion && <p className="text-xs text-muted-foreground">{c.direccion}</p>}
                </div>
            </Panel>

            <FilaKpis>
                <Kpi titulo="Saldo" valor={usd(r.saldo)} detalle={`${num(datos.pendientes.length)} documentos`} extra={[`Por vencer: ${usd(r.porVencer)}`, ...(r.aFavor > 0 ? [`A favor: ${usd(r.aFavor)} · neto ${usd(r.neto)}`] : [])]} />
                <Kpi titulo="Vencido" valor={usd(r.vencido)} alerta={r.vencido > 0} detalle={r.vencido > 0 ? `${num(datos.pendientes.filter((p) => (p.dias_vencido ?? 0) > 0).length)} documentos` : "Al día"} />
                <Kpi
                    titulo="Crédito disponible"
                    valor={r.creditoDisponible == null ? "—" : usd(r.creditoDisponible)}
                    alerta={r.creditoDisponible != null && r.creditoDisponible < 0}
                    detalle={r.creditoDisponible == null ? "Sin límite de crédito" : `de ${usd(c.limiteCredito)}`}
                />
                <Kpi titulo="Compras 12 meses" valor={usd(r.compras12)} detalle={`${num(r.facturas12)} facturas`} extra={[`Última compra: ${fecha(r.ultima_compra)}`, `Último pago: ${fecha(r.ultimo_pago)}`]} />
            </FilaKpis>

            <Panel titulo="Documentos pendientes" detalle="Facturas y notas de débito con saldo, de la más vieja a la más nueva. En rojo, vencidas hace más de 30 días.">
                {!datos.pendientes.length ? (
                    <p className="text-sm text-muted-foreground">No tiene documentos pendientes.</p>
                ) : (
                    <Tabla>
                        <thead><tr><th className={th}>Documento</th><th className={th}>Emisión</th><th className={th}>Vence</th><th className={thNum}>Días vencido</th><th className={thNum}>Monto</th><th className={thNum}>Saldo</th></tr></thead>
                        <tbody>
                            {datos.pendientes.map((p) => (
                                <Fragment key={`${p.tipo}-${p.numero}`}>
                                    <tr>
                                        <td className={td}>{p.etiqueta} <span className="font-mono text-xs">{p.numero}</span></td>
                                        <td className={cn(td, "whitespace-nowrap")}>{fecha(p.emision)}</td>
                                        <td className={cn(td, "whitespace-nowrap")}>{fecha(p.vencimiento)}</td>
                                        <td className={cn(tdNum, (p.dias_vencido ?? 0) > 30 ? "font-semibold text-red-600 dark:text-red-400" : (p.dias_vencido ?? 0) > 0 && "text-red-600 dark:text-red-400")}>
                                            {(p.dias_vencido ?? 0) > 0 ? num(p.dias_vencido) : "por vencer"}
                                        </td>
                                        <td className={tdNum}>{usd(p.monto)}</td>
                                        <td className={cn(tdNum, "font-semibold")}>{usd(p.saldo)}</td>
                                    </tr>
                                    {/* Abonos aplicados a este documento, como en Valery: debajo de la factura */}
                                    {(p.abonos ?? []).map((a) => (
                                        <tr key={`${p.numero}-${a.tipo}-${a.numero}`} className="text-emerald-700 dark:text-emerald-300">
                                            <td className={cn(td, "pl-6")}>{a.etiqueta} <span className="font-mono text-xs">{a.numero}</span></td>
                                            <td className={cn(td, "whitespace-nowrap")}>{fecha(a.fecha)}</td>
                                            <td className={td}></td>
                                            <td className={td}></td>
                                            <td className={tdNum}>
                                                −{usd(a.monto)}
                                                {a.total - a.monto > 0.005 && <span className="block text-[11px] text-muted-foreground">de {usd(a.total)}</span>}
                                            </td>
                                            <td className={td}></td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </Tabla>
                )}
                {datos.aFavor.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        A favor del cliente: {datos.aFavor.map((a) => `${a.etiqueta} ${a.numero} (${usd(a.saldo)})`).join(" · ")}
                    </p>
                )}
            </Panel>
        </div>
    );
}
