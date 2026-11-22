"use client";

import { Fragment, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EstadoCarga, mensajeError, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, usd } from "./formato";
import { ArticuloProveedor, excelParaProveedor } from "./exportarPedido";

type Situacion = "enviado" | "en_camino" | "parcial" | "recibido" | "cerrado" | "anulado";

interface LineaPedido {
    linea: number; productoId: number; codigo: string; descripcion: string; cantidad: number; cantidadOriginal: number | null;
    recibido: number; pendiente: number; costo: number; articulo: ArticuloProveedor | null;
}
interface Pedido {
    id: number; numero: string; proveedorId: number; proveedor: string; fecha: string; creadoPor: string | null; notas: string | null;
    llegadaEstimada: string; atrasado: boolean; situacion: Situacion; abierto: boolean;
    total: number; totalOriginal: number; pendiente: number; unidades: number; unidadesPendientes: number;
    lineas: LineaPedido[];
}
interface Sugerencia {
    productoId: number; codigo: string; nombre: string; comprar: number; costo: number; inversion: number; margen: number;
    enPedido: boolean; prioridad: string; articulo: ArticuloProveedor;
}

const ETIQUETA: Record<Situacion, string> = {
    enviado: "Enviado, falta respuesta", en_camino: "En camino", parcial: "Llegó una parte", recibido: "Recibido", cerrado: "Cerrado a mano", anulado: "Anulado",
};
const TONO: Record<Situacion, string> = {
    enviado: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    en_camino: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    parcial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    recibido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    cerrado: "bg-muted text-muted-foreground",
    anulado: "bg-muted text-muted-foreground line-through",
};
const boton = "rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground";

/**
 * Pedidos guardados desde el planificador. Mientras no llegue su factura de compra a Valery,
 * lo pedido cuenta como en camino y el planificador no lo vuelve a proponer.
 */
export function PedidosEnCamino({ recarga, onCambio }: { recarga: number; onCambio: () => void }) {
    const { datos, error, cargando } = useAnalitica<{ pedidos: Pedido[] }>(`pedidos?r=${recarga}`, { conservar: true });
    const [abierto, setAbierto] = useState<number | null>(null);
    const [confirmar, setConfirmar] = useState<{ id: number; accion: "anular" | "cerrar" | "confirmar" } | null>(null);
    const [fallo, setFallo] = useState<string | null>(null);

    const cambiar = async (id: number, accion: "anular" | "cerrar" | "confirmar") => {
        setFallo(null);
        try {
            await api.patch(`/analitica/pedidos/${id}`, { accion });
            setConfirmar(null);
            onCambio();
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo cambiar el pedido."));
        }
    };

    return (
        <Panel
            titulo="Pedidos en camino"
            detalle="Los pedidos guardados desde aquí. Mientras el proveedor no responde quedan como enviados: ábrelos para anotar lo que sí tiene, reformular con lo que sobró y confirmar. Lo que falta por llegar se descuenta de lo que hay que comprar y se da por recibido solo cuando la factura entra a Valery."
        >
            {!datos ? (
                <EstadoCarga cargando={cargando} error={error} />
            ) : !datos.pedidos.length ? (
                <p className="text-sm text-muted-foreground">Todavía no hay pedidos guardados. Usa “Guardar pedido” en el pedido de abajo cuando se lo envíes al proveedor.</p>
            ) : (
                <>
                    {fallo && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{fallo}</p>}
                    <Tabla>
                        <thead><tr><th className={th}>Pedido</th><th className={th}>Proveedor</th><th className={th}>Llega aprox.</th><th className={thNum}>Falta llegar</th><th className={thNum}>Monto pendiente</th><th className={th}>Estado</th><th className={th}></th></tr></thead>
                        <tbody>
                            {datos.pedidos.map((p) => (
                                <Fragment key={p.id}>
                                    <tr>
                                        <td className={cn(td, "whitespace-nowrap")}>
                                            <span className="font-mono text-xs">{p.numero}</span>
                                            <span className="block text-xs text-muted-foreground">{fecha(p.fecha)}{p.creadoPor ? ` · ${p.creadoPor}` : ""}</span>
                                        </td>
                                        <td className={td}>{p.proveedor}</td>
                                        <td className={cn(td, "whitespace-nowrap", p.atrasado && "font-medium text-red-600 dark:text-red-400")}>
                                            {p.abierto ? fecha(p.llegadaEstimada) : "—"}
                                            {p.atrasado && <span className="block text-xs">Atrasado</span>}
                                        </td>
                                        <td className={tdNum}>{num(p.unidadesPendientes)}<span className="block text-[11px] text-muted-foreground">de {num(p.unidades)} u.</span></td>
                                        <td className={tdNum}>{usd(p.pendiente)}<span className="block text-[11px] text-muted-foreground">de {usd(p.total)}</span></td>
                                        <td className={td}><span className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", TONO[p.situacion])}>{ETIQUETA[p.situacion]}</span></td>
                                        <td className={cn(td, "whitespace-nowrap text-right")}>
                                            {confirmar?.id === p.id ? (
                                                <span className="inline-flex items-center gap-1 text-xs">
                                                    {confirmar.accion === "anular" ? "¿Anular el pedido?" : confirmar.accion === "confirmar" ? "¿El proveedor lo confirmó así?" : "¿Cerrarlo? Lo que falta deja de contar."}
                                                    <button type="button" className={cn(boton, "text-red-600 dark:text-red-400")} onClick={() => cambiar(p.id, confirmar.accion)}>Sí</button>
                                                    <button type="button" className={boton} onClick={() => setConfirmar(null)}>No</button>
                                                </span>
                                            ) : (
                                                <span className="inline-flex gap-1">
                                                    <button type="button" className={boton} onClick={() => setAbierto(abierto === p.id ? null : p.id)}>{abierto === p.id ? "Ocultar" : p.situacion === "enviado" ? "Ajustar" : "Ver"}</button>
                                                    {p.situacion === "enviado" && <button type="button" className={boton} onClick={() => setConfirmar({ id: p.id, accion: "confirmar" })}>Confirmar</button>}
                                                    {p.abierto && <button type="button" className={boton} onClick={() => setConfirmar({ id: p.id, accion: "cerrar" })}>Cerrar</button>}
                                                    {p.abierto && <button type="button" className={boton} onClick={() => setConfirmar({ id: p.id, accion: "anular" })}>Anular</button>}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {abierto === p.id && (
                                        <tr>
                                            <td colSpan={7} className="border-b border-border bg-muted px-3 py-3">
                                                <DetallePedido pedido={p} onCambio={onCambio} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </Tabla>
                </>
            )}
        </Panel>
    );
}

/**
 * Detalle de un pedido. Si está enviado y el proveedor respondió, aquí se anota lo que sí tiene
 * (0 = no lo tiene) y se reformula con lo que sobró: subir cantidades de lo que sí tiene o
 * agregar los siguientes repuestos de la lista de prioridad.
 */
function DetallePedido({ pedido, onCambio }: { pedido: Pedido; onCambio: () => void }) {
    const editable = pedido.situacion === "enviado";
    const [cantidades, setCantidades] = useState<Record<string, string>>({});
    const [fallo, setFallo] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [cobertura, setCobertura] = useState(30);
    const [reform, setReform] = useState<{ sobra: number; sugerencias: Sugerencia[]; coberturas: number[] } | null>(null);
    const [elegidas, setElegidas] = useState<Set<string>>(new Set());

    const cambiadas = pedido.lineas
        .filter((l) => cantidades[l.codigo] != null && cantidades[l.codigo] !== "" && Number(cantidades[l.codigo]) !== l.cantidad)
        .map((l) => ({ codigo: l.codigo, cantidad: Math.max(0, Math.floor(Number(cantidades[l.codigo]))) }));

    const guardarRespuesta = async () => {
        setFallo(null);
        setGuardando(true);
        try {
            await api.put(`/analitica/pedidos/${pedido.id}/lineas`, { lineas: cambiadas });
            setCantidades({});
            setReform(null);
            onCambio();
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo guardar."));
        } finally {
            setGuardando(false);
        }
    };

    const reformular = async (dias = cobertura) => {
        setFallo(null);
        try {
            const r = await api.get(`/analitica/pedidos/${pedido.id}/reformular`, { params: { cobertura: dias } });
            setReform(r.data);
            setElegidas(new Set(r.data.sugerencias.map((x: Sugerencia) => x.codigo)));
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo reformular."));
        }
    };

    const agregar = async () => {
        if (!reform) return;
        const lineas = reform.sugerencias.filter((x) => elegidas.has(x.codigo)).map((x) => {
            const ya = pedido.lineas.find((l) => l.codigo === x.codigo);
            return { codigo: x.codigo, cantidad: (ya?.cantidad ?? 0) + x.comprar, costo: x.costo, articulo: x.articulo };
        });
        if (!lineas.length) return;
        setGuardando(true);
        try {
            await api.put(`/analitica/pedidos/${pedido.id}/lineas`, { lineas });
            setReform(null);
            onCambio();
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo agregar al pedido."));
        } finally {
            setGuardando(false);
        }
    };

    const sobra = pedido.totalOriginal - pedido.total;
    const seleccion = reform?.sugerencias.filter((x) => elegidas.has(x.codigo)) ?? [];

    return (
        <div className="space-y-3">
            {pedido.notas && <p className="text-xs text-muted-foreground">Nota: {pedido.notas}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                    {editable
                        ? "Cuando el proveedor responda, cambia la cantidad de lo que no tiene completo (0 si no lo tiene) y guarda."
                        : "Lo que llegó se toma de las facturas de compra que entran a Valery."}
                </p>
                <button
                    type="button"
                    onClick={() => excelParaProveedor(pedido.lineas.map((l) => ({ codigo: l.codigo, nombre: l.descripcion, cantidad: l.cantidad, costo: l.costo, articulo: l.articulo })), pedido.proveedor, pedido.fecha, pedido.numero)}
                    className={cn(boton, "inline-flex items-center gap-1")}
                >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel para el proveedor
                </button>
            </div>
            <table className="w-full text-xs">
                <thead><tr><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Pedido</th>{editable ? <th className={thNum}>Tiene</th> : <><th className={thNum}>Llegó</th><th className={thNum}>Falta</th></>}<th className={thNum}>Costo</th></tr></thead>
                <tbody>
                    {pedido.lineas.map((l) => (
                        <tr key={l.codigo} className={cn(l.cantidad === 0 && "text-muted-foreground line-through")}>
                            <td className={tdCodigo}>{l.codigo}{l.articulo?.numeroPieza && <span className="block">{l.articulo.numeroPieza}</span>}</td>
                            <td className={td}>{l.descripcion}{l.cantidadOriginal == null && <span className="ml-1 text-[11px] text-primary">agregado</span>}</td>
                            <td className={tdNum}>{num(l.cantidadOriginal ?? l.cantidad)}</td>
                            {editable ? (
                                <td className={tdNum}>
                                    <span className="inline-flex items-center gap-1">
                                        <input
                                            inputMode="numeric" aria-label={`Cantidad que tiene de ${l.codigo}`}
                                            value={cantidades[l.codigo] ?? String(l.cantidad)}
                                            onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCantidades((c) => ({ ...c, [l.codigo]: v })); }}
                                            className="w-16 rounded border border-border bg-card px-1.5 py-0.5 text-right font-mono"
                                        />
                                        <button type="button" className={boton} onClick={() => setCantidades((c) => ({ ...c, [l.codigo]: "0" }))}>No hay</button>
                                    </span>
                                </td>
                            ) : (
                                <>
                                    <td className={tdNum}>{num(l.recibido)}</td>
                                    <td className={cn(tdNum, l.pendiente > 0 && "font-semibold")}>{num(l.pendiente)}</td>
                                </>
                            )}
                            <td className={tdNum}>{usd(l.costo)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {fallo && <p className="text-xs text-red-600 dark:text-red-400">{fallo}</p>}
            {editable && (
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={!cambiadas.length || guardando} onClick={guardarRespuesta} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
                        Guardar respuesta del proveedor{cambiadas.length ? ` (${num(cambiadas.length)})` : ""}
                    </button>
                    {sobra >= 1 && !cambiadas.length && (
                        <>
                            <span className="text-xs">Sobran {usd(sobra)} de lo que se pidió al principio.</span>
                            <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                cubrir
                                <select value={cobertura} onChange={(e) => { setCobertura(Number(e.target.value)); if (reform) reformular(Number(e.target.value)); }} className="rounded border border-border bg-card px-1 py-0.5 text-xs text-foreground">
                                    {[15, 30, 45, 60, 90].map((c) => <option key={c} value={c}>{c} días</option>)}
                                </select>
                            </label>
                            <button type="button" onClick={() => reformular()} className={boton}>Reformular</button>
                        </>
                    )}
                </div>
            )}
            {reform && (
                <div className="space-y-2 rounded-md border border-primary p-3">
                    {!reform.sugerencias.length ? (
                        <p className="text-xs text-muted-foreground">No hay nada más que pedirle a este proveedor con {usd(reform.sobra)}. Prueba cubriendo más días o confirma el pedido como está.</p>
                    ) : (
                        <>
                            <p className="text-xs">Con {usd(reform.sobra)}: marca lo que quieres sumar. «Subir» es más cantidad de algo que sí tiene; «Nuevo» es un repuesto que no estaba en el pedido.</p>
                            <table className="w-full text-xs">
                                <thead><tr><th className={th}></th><th className={th}>Repuesto</th><th className={thNum}>Sumar</th><th className={thNum}>Costo</th><th className={thNum}>Inversión</th></tr></thead>
                                <tbody>
                                    {reform.sugerencias.map((x) => (
                                        <tr key={x.codigo}>
                                            <td className={td}>
                                                <input
                                                    type="checkbox" aria-label={`Sumar ${x.codigo}`} checked={elegidas.has(x.codigo)}
                                                    onChange={() => setElegidas((previas) => { const n = new Set(previas); if (n.has(x.codigo)) n.delete(x.codigo); else n.add(x.codigo); return n; })}
                                                />
                                            </td>
                                            <td className={td}>
                                                <span className={cn("mr-1 rounded px-1 py-0.5 text-[10px] font-medium", x.enPedido ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")}>
                                                    {x.enPedido ? "Subir" : "Nuevo"}
                                                </span>
                                                <span className="font-mono">{x.codigo}</span> {x.nombre}
                                            </td>
                                            <td className={tdNum}>+{num(x.comprar)}</td>
                                            <td className={tdNum}>{usd(x.costo)}</td>
                                            <td className={tdNum}>{usd(x.inversion)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" disabled={!seleccion.length || guardando} onClick={agregar} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
                                    Agregar al pedido ({usd(seleccion.reduce((t, x) => t + x.inversion, 0))})
                                </button>
                                <button type="button" onClick={() => setReform(null)} className={boton}>Cancelar</button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
