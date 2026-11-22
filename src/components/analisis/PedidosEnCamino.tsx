"use client";

import { Fragment, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EstadoCarga, mensajeError, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, usd } from "./formato";

type Situacion = "en_camino" | "parcial" | "recibido" | "cerrado" | "anulado";

interface Pedido {
    id: number; numero: string; proveedor: string; fecha: string; creadoPor: string | null; notas: string | null;
    llegadaEstimada: string; atrasado: boolean; situacion: Situacion; abierto: boolean;
    total: number; pendiente: number; unidades: number; unidadesPendientes: number;
    lineas: { codigo: string; descripcion: string; cantidad: number; recibido: number; pendiente: number; costo: number }[];
}

const ETIQUETA: Record<Situacion, string> = {
    en_camino: "En camino", parcial: "Llegó una parte", recibido: "Recibido", cerrado: "Cerrado a mano", anulado: "Anulado",
};
const TONO: Record<Situacion, string> = {
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
    const { datos, error, cargando } = useAnalitica<{ pedidos: Pedido[] }>(`pedidos?r=${recarga}`);
    const [abierto, setAbierto] = useState<number | null>(null);
    const [confirmar, setConfirmar] = useState<{ id: number; accion: "anular" | "cerrar" } | null>(null);
    const [fallo, setFallo] = useState<string | null>(null);

    const cambiar = async (id: number, accion: "anular" | "cerrar") => {
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
            detalle="Los pedidos guardados desde aquí. Lo que falta por llegar se descuenta de lo que hay que comprar. Se dan por recibidos solos cuando la factura de compra del proveedor entra a Valery; si algo no va a llegar, ciérralo a mano."
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
                                                    {confirmar.accion === "anular" ? "¿Anular el pedido?" : "¿Cerrarlo? Lo que falta deja de contar."}
                                                    <button type="button" className={cn(boton, "text-red-600 dark:text-red-400")} onClick={() => cambiar(p.id, confirmar.accion)}>Sí</button>
                                                    <button type="button" className={boton} onClick={() => setConfirmar(null)}>No</button>
                                                </span>
                                            ) : (
                                                <span className="inline-flex gap-1">
                                                    <button type="button" className={boton} onClick={() => setAbierto(abierto === p.id ? null : p.id)}>{abierto === p.id ? "Ocultar" : "Ver"}</button>
                                                    {p.abierto && <button type="button" className={boton} onClick={() => setConfirmar({ id: p.id, accion: "cerrar" })}>Cerrar</button>}
                                                    {p.abierto && <button type="button" className={boton} onClick={() => setConfirmar({ id: p.id, accion: "anular" })}>Anular</button>}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {abierto === p.id && (
                                        <tr>
                                            <td colSpan={7} className="border-b border-border bg-muted px-3 py-3">
                                                {p.notas && <p className="mb-2 text-xs text-muted-foreground">Nota: {p.notas}</p>}
                                                <table className="w-full text-xs">
                                                    <thead><tr><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Pedido</th><th className={thNum}>Llegó</th><th className={thNum}>Falta</th><th className={thNum}>Costo</th></tr></thead>
                                                    <tbody>
                                                        {p.lineas.map((l) => (
                                                            <tr key={l.codigo}>
                                                                <td className={tdCodigo}>{l.codigo}</td>
                                                                <td className={td}>{l.descripcion}</td>
                                                                <td className={tdNum}>{num(l.cantidad)}</td>
                                                                <td className={tdNum}>{num(l.recibido)}</td>
                                                                <td className={cn(tdNum, l.pendiente > 0 && "font-semibold")}>{num(l.pendiente)}</td>
                                                                <td className={tdNum}>{usd(l.costo)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
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
