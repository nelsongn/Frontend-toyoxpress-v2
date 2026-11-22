"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Movimiento de inventario de un producto, documento por documento, con los períodos de Valery
 * (hoy, ayer, semana, mes, año, todos) o un rango de fechas. Sale de la base de Valery, así que
 * llega hasta la última vez que se corrió el actualizador.
 */

interface Movimiento {
    fecha: string; tipo: string; etiqueta: string; numero: string; tercero: string | null; detalle: string | null;
    entrada: number; salida: number; saldo: number; costo?: number | null;
}
interface Datos {
    producto: { codigo: string; nombre: string; ref: string | null; stock: number };
    datosAl: string; verCostos: boolean;
    inicial: number; final: number; entradas: number; salidas: number; total: number;
    movimientos: Movimiento[];
}

const PERIODOS = [
    { id: "hoy", nombre: "Hoy" },
    { id: "ayer", nombre: "Ayer" },
    { id: "semana", nombre: "Semana actual" },
    { id: "semana_ant", nombre: "Semana anterior" },
    { id: "mes", nombre: "Mes actual" },
    { id: "mes_ant", nombre: "Mes anterior" },
    { id: "anio", nombre: "Año actual" },
    { id: "todos", nombre: "Todos los días (sin restricción de fecha)" },
    { id: "rango", nombre: "Rango de fechas…" },
] as const;
type Periodo = (typeof PERIODOS)[number]["id"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const entero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Hoy en Venezuela, AAAA-MM-DD. */
function hoyCaracas(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}
function sumar(fecha: string, dias: number): string {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
}
function fechaCorta(f: string): string {
    const [a, m, d] = f.slice(0, 10).split("-");
    return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
}

/** Desde y hasta de cada período (la semana empieza el lunes). null = sin límite. */
export function rangoDePeriodo(p: Periodo, hoy = hoyCaracas()): { desde: string | null; hasta: string | null } {
    const a = Number(hoy.slice(0, 4));
    const diaSemana = (new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
    const lunes = sumar(hoy, -diaSemana);
    const finMesAnterior = sumar(`${hoy.slice(0, 7)}-01`, -1);
    switch (p) {
        case "hoy": return { desde: hoy, hasta: hoy };
        case "ayer": return { desde: sumar(hoy, -1), hasta: sumar(hoy, -1) };
        case "semana": return { desde: lunes, hasta: hoy };
        case "semana_ant": return { desde: sumar(lunes, -7), hasta: sumar(lunes, -1) };
        case "mes": return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
        case "mes_ant": return { desde: `${finMesAnterior.slice(0, 7)}-01`, hasta: finMesAnterior };
        case "anio": return { desde: `${a}-01-01`, hasta: hoy };
        default: return { desde: null, hasta: null };
    }
}

export function MovimientosProductoModal({ codigo, nombre, onClose }: { codigo: string | null; nombre?: string; onClose: () => void }) {
    const [periodo, setPeriodo] = useState<Periodo>("anio");
    const [rango, setRango] = useState(() => ({ desde: `${hoyCaracas().slice(0, 4)}-01-01`, hasta: hoyCaracas() }));
    const [estado, setEstado] = useState<{ clave: string; datos: Datos | null; error: string | null } | null>(null);

    const { desde, hasta } = periodo === "rango" ? rango : rangoDePeriodo(periodo);
    const rangoValido = periodo !== "rango" || (!!rango.desde && !!rango.hasta && rango.desde <= rango.hasta);
    const clave = `${codigo}|${desde}|${hasta}`;

    useEffect(() => {
        if (!codigo || !rangoValido) return;
        let vigente = true;
        api.get(`/productos/${encodeURIComponent(codigo)}/movimientos`, { params: { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) } })
            .then((r) => vigente && setEstado({ clave, datos: r.data, error: null }))
            .catch((e) => vigente && setEstado({ clave, datos: null, error: e?.response?.data?.message || "No se pudo cargar el movimiento." }));
        return () => { vigente = false; };
    }, [codigo, desde, hasta, clave, rangoValido]);

    const listo = estado?.clave === clave;
    const datos = listo ? estado.datos : null;
    const error = listo ? estado.error : null;

    const exportar = async () => {
        if (!datos) return;
        const XLSX = await import("xlsx");
        const filas = datos.movimientos.map((m) => ({
            Fecha: m.fecha.slice(0, 10), Movimiento: m.etiqueta, Documento: m.numero,
            "Cliente / proveedor": m.tercero ?? "", Detalle: m.detalle ?? "",
            Entrada: m.entrada || "", Salida: m.salida || "", Saldo: m.saldo,
            ...(datos.verCostos ? { "Costo unitario": m.costo ?? "" } : {}),
        }));
        const hoja = XLSX.utils.json_to_sheet(filas);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Movimiento");
        XLSX.writeFile(libro, `Movimiento_${datos.producto.codigo}_${desde ?? "inicio"}_${hasta ?? datos.datosAl}.xlsx`);
    };

    const control = "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";
    const th = "border-b border-border py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
    const td = "border-b border-border py-2 pr-3 align-top";
    const num = "text-right font-mono tabular-nums";

    return (
        <Dialog open={!!codigo} onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-[960px]">
                <DialogHeader>
                    <DialogTitle className="pr-6">Movimiento de inventario</DialogTitle>
                    <DialogDescription>
                        <span className="font-mono">{codigo}</span> · {datos?.producto.nombre ?? nombre}
                        {datos?.producto.ref ? ` · REF ${datos.producto.ref}` : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Período
                        <select aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className={control}>
                            {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </label>
                    {periodo === "rango" && (
                        <>
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                Desde
                                <input type="date" value={rango.desde} min="2019-01-01" max={hoyCaracas()} onChange={(e) => setRango({ ...rango, desde: e.target.value })} className={control} />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                Hasta
                                <input type="date" value={rango.hasta} min="2019-01-01" max={hoyCaracas()} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} className={control} />
                            </label>
                        </>
                    )}
                    <p className="pb-1.5 text-xs text-muted-foreground">
                        {desde || hasta ? `${desde ? fechaCorta(desde) : "Inicio"} – ${hasta ? fechaCorta(hasta) : "hoy"}` : "Desde el primer registro"}
                        {datos ? ` · datos de Valery al ${fechaCorta(datos.datosAl)}` : ""}
                    </p>
                    <button
                        type="button" onClick={exportar} disabled={!datos?.movimientos.length}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
                    >
                        <Download className="h-3.5 w-3.5" /> Excel
                    </button>
                </div>

                {!rangoValido ? (
                    <p className="text-sm text-red-600 dark:text-red-400">La fecha desde debe ser anterior o igual a la fecha hasta.</p>
                ) : error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : !datos ? (
                    <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando movimiento…</p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[
                                { t: "Existencia al inicio", v: datos.inicial },
                                { t: "Entradas", v: datos.entradas, tono: "text-emerald-600 dark:text-emerald-400" },
                                { t: "Salidas", v: datos.salidas, tono: "text-red-600 dark:text-red-400" },
                                { t: "Existencia al final", v: datos.final },
                            ].map((k) => (
                                <div key={k.t} className="rounded-lg border border-border p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.t}</p>
                                    <p className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", k.tono)}>{entero.format(k.v)}</p>
                                </div>
                            ))}
                        </div>
                        {datos.datosAl < (hasta ?? hoyCaracas()) && (
                            <p className="text-xs text-muted-foreground">
                                Lo posterior al {fechaCorta(datos.datosAl)} todavía no se ha cargado desde Valery.
                            </p>
                        )}
                        <div className="min-h-0 flex-1 overflow-auto">
                            {!datos.movimientos.length ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos en este período.</p>
                            ) : (
                                <table className="w-full min-w-[640px] text-sm">
                                    <thead className="sticky top-0 bg-background">
                                        <tr>
                                            <th className={th}>Fecha</th><th className={th}>Movimiento</th><th className={th}>Cliente / proveedor</th>
                                            <th className={cn(th, "text-right")}>Entrada</th><th className={cn(th, "text-right")}>Salida</th><th className={cn(th, "text-right")}>Saldo</th>
                                            {datos.verCostos && <th className={cn(th, "text-right")}>Costo</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {datos.movimientos.map((m, i) => (
                                            <tr key={`${m.tipo}-${m.numero}-${i}`}>
                                                <td className={cn(td, "whitespace-nowrap")}>{fechaCorta(m.fecha)}</td>
                                                <td className={cn(td, "whitespace-nowrap")}>{m.etiqueta}<span className="block font-mono text-xs text-muted-foreground">{m.numero}</span></td>
                                                <td className={td}>{m.tercero ?? ""}{m.detalle && <span className="block text-xs text-muted-foreground">{m.detalle}</span>}</td>
                                                <td className={cn(td, num, "text-emerald-600 dark:text-emerald-400")}>{m.entrada ? entero.format(m.entrada) : ""}</td>
                                                <td className={cn(td, num, "text-red-600 dark:text-red-400")}>{m.salida ? entero.format(m.salida) : ""}</td>
                                                <td className={cn(td, num, "font-semibold", m.saldo < 0 && "text-red-600 dark:text-red-400")}>{entero.format(m.saldo)}</td>
                                                {datos.verCostos && <td className={cn(td, num)}>{m.costo != null ? usd.format(m.costo) : ""}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {datos.total > datos.movimientos.length && (
                                <p className="pt-2 text-xs text-muted-foreground">Se muestran los {entero.format(datos.movimientos.length)} movimientos más recientes de {entero.format(datos.total)}.</p>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
