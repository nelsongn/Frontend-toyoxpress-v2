"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, ImageIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoCarga, FilaKpis, Kpi, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { decimal, fecha, num, pct, usd } from "./formato";
import { ImagenLiquidacion } from "./ImagenLiquidacion";

/**
 * Lista de liquidación del dinero parado. Javier: liquidarlo en lote; si no se puede, un descuento
 * atractivo por pago de contado. Cada repuesto tiene dos precios sobre su precio mínimo de Valery
 * (al que de verdad se vende): por pieza de contado y, más bajo, si se lleva el lote completo.
 */

interface Articulo {
    productoId: number; codigo: string; nombre: string; familia: string | null; marca: string | null; origen: string | null; ref: string | null;
    tipo: "sin_ventas" | "sobre_stock"; stock: number; liquidar: number; ventaAnual: number; mesesDeStock: number | null;
    costo: number; precio: number | null; ultimaVenta: string | null; ultimaCompra: string | null;
}
interface Datos {
    datosAl: string;
    reglas: { mesesSobreStock: number; mesesAConservar: number; valorMinimo: number };
    articulos: Articulo[];
}

const DESCUENTOS_PIEZA = [10, 15, 20, 25, 30];
const DESCUENTOS_LOTE = [20, 25, 30, 35, 40, 50];
const control = "rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground";
const boton = "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted";
const redondear = (n: number) => Math.round(n * 100) / 100;

/** Precio con descuento; si se pide, nunca por debajo del costo. */
function precioCon(a: Articulo, descuento: number, pisoCosto: boolean): number {
    const base = a.precio ?? a.costo;
    const p = base * (1 - descuento / 100);
    return redondear(pisoCosto ? Math.max(p, a.costo) : p);
}

export function VistaLiquidacion() {
    const { datos, error, cargando } = useAnalitica<Datos>("liquidacion");
    const [descPieza, setDescPieza] = useState(15);
    const [descLote, setDescLote] = useState(30);
    const [pisoCosto, setPisoCosto] = useState(true);
    const [tipo, setTipo] = useState<"todos" | "sin_ventas" | "sobre_stock">("todos");
    const [buscar, setBuscar] = useState("");
    // Repuestos que se sacan del lote (por defecto van todos)
    const [fuera, setFuera] = useState<Set<number>>(new Set());
    // Imagen para redes: si se muestra y con qué precio
    const [imagen, setImagen] = useState<"contado" | "lote" | null>(null);
    // Al abrir la imagen, la página baja hasta ella (si no, parece que el botón no hace nada)
    const panelImagen = useRef<HTMLDivElement>(null);
    const imagenAbierta = imagen !== null;
    useEffect(() => {
        if (imagenAbierta) panelImagen.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [imagenAbierta]);

    const visibles = useMemo(() => {
        const t = buscar.trim().toLowerCase();
        return (datos?.articulos ?? []).filter((a) =>
            (tipo === "todos" || a.tipo === tipo)
            && (!t || `${a.codigo} ${a.nombre} ${a.familia ?? ""} ${a.marca ?? ""} ${a.ref ?? ""}`.toLowerCase().includes(t)));
    }, [datos, tipo, buscar]);

    if (!datos) return <EstadoCarga cargando={cargando} error={error} />;

    const enLote = visibles.filter((a) => !fuera.has(a.productoId));
    const total = (f: (a: Articulo) => number) => enLote.reduce((s, a) => s + f(a), 0);
    const costo = total((a) => a.liquidar * a.costo);
    const normal = total((a) => a.liquidar * (a.precio ?? a.costo));
    const porPieza = total((a) => a.liquidar * precioCon(a, descPieza, pisoCosto));
    const lote = total((a) => a.liquidar * precioCon(a, descLote, pisoCosto));
    const r = datos.reglas;

    const alternar = (id: number) => setFuera((f) => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const todos = (incluir: boolean) => setFuera((f) => {
        const n = new Set(f);
        for (const a of visibles) { if (incluir) n.delete(a.productoId); else n.add(a.productoId); }
        return n;
    });

    /** Excel para ofrecer a los clientes: sin costos ni datos internos. */
    const excelClientes = async () => {
        const XLSX = await import("xlsx");
        const filas = enLote.map((a) => ({
            Código: a.codigo, Repuesto: a.nombre, Marca: a.marca ? `${a.marca}${a.origen ? ` (${a.origen})` : ""}` : "",
            Disponible: a.liquidar,
            "Precio normal": a.precio ?? "",
            [`Precio de contado (-${descPieza} %)`]: precioCon(a, descPieza, pisoCosto),
            [`Precio llevando todo el lote (-${descLote} %)`]: precioCon(a, descLote, pisoCosto),
        }));
        const hoja = XLSX.utils.json_to_sheet(filas);
        XLSX.utils.sheet_add_aoa(hoja, [[], ["", "Total del lote completo", "", "", "", "", redondear(lote)]], { origin: -1 });
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Liquidación");
        XLSX.writeFile(libro, `Liquidacion_ToyoXpress_${datos.datosAl}.xlsx`);
    };

    /** Excel interno: con costo, margen y por qué entra cada repuesto. */
    const excelInterno = async () => {
        const XLSX = await import("xlsx");
        const filas = enLote.map((a) => ({
            Código: a.codigo, Ref: a.ref ?? "", Repuesto: a.nombre, Familia: a.familia ?? "", Marca: a.marca ?? "",
            Motivo: a.tipo === "sin_ventas" ? "Sin ventas en 12 meses" : `Stock para ${decimal(a.mesesDeStock ?? 0)} meses`,
            Stock: a.stock, "A liquidar": a.liquidar, "Venta 12 m (u.)": a.ventaAnual,
            "Costo unitario": redondear(a.costo), "Precio mínimo": a.precio ?? "",
            "Precio contado": precioCon(a, descPieza, pisoCosto), "Precio lote": precioCon(a, descLote, pisoCosto),
            "Costo a liquidar": redondear(a.liquidar * a.costo), "Recupera en lote": redondear(a.liquidar * precioCon(a, descLote, pisoCosto)),
            "Última venta": a.ultimaVenta ?? "", "Última compra": a.ultimaCompra ?? "",
        }));
        const hoja = XLSX.utils.json_to_sheet(filas);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Liquidación");
        XLSX.writeFile(libro, `Liquidacion_interno_${datos.datosAl}.xlsx`);
    };

    return (
        <div className="space-y-5">
            <Panel
                titulo="Liquidación del dinero parado"
                detalle={`Repuestos comprados hace más de 12 meses que no vendieron nada en 12 meses (se liquida todo) o que tienen stock para más de ${r.mesesSobreStock} meses (se liquida lo que pasa de ${r.mesesAConservar} meses de venta). Precios sobre el precio mínimo de Valery, que es al que de verdad se vende.`}
            >
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Descuento por pieza, de contado
                        <select value={descPieza} onChange={(e) => setDescPieza(Number(e.target.value))} className={control}>
                            {DESCUENTOS_PIEZA.map((d) => <option key={d} value={d}>{d} %</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Descuento llevando el lote completo
                        <select value={descLote} onChange={(e) => setDescLote(Number(e.target.value))} className={control}>
                            {DESCUENTOS_LOTE.map((d) => <option key={d} value={d}>{d} %</option>)}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={pisoCosto} onChange={(e) => setPisoCosto(e.target.checked)} />
                        No bajar del costo
                    </label>
                </div>
            </Panel>

            <FilaKpis>
                <Kpi titulo="Dinero parado a liquidar" valor={usd(costo)} detalle={`${num(enLote.length)} repuestos a costo`} extra={[`A precio normal: ${usd(normal)}`]} />
                <Kpi
                    titulo="Si se vende por pieza"
                    valor={usd(porPieza)}
                    detalle={`${descPieza} % de descuento de contado`}
                    extra={[`${porPieza >= costo ? "Ganancia" : "Pérdida"} contra el costo: ${usd(Math.abs(porPieza - costo))}`]}
                />
                <Kpi
                    titulo="Si se lleva el lote completo"
                    valor={usd(lote)}
                    detalle={`${descLote} % de descuento`}
                    alerta={lote < costo}
                    extra={[`${lote >= costo ? "Ganancia" : "Pérdida"} contra el costo: ${usd(Math.abs(lote - costo))}`]}
                />
                <Kpi titulo="Recupera del costo" valor={pct(costo ? lote / costo : 0)} detalle="Vendiendo el lote completo" />
            </FilaKpis>

            {imagen && (
                <div ref={panelImagen} className="scroll-mt-4">
                <Panel
                    titulo="Imagen para redes"
                    detalle="Formato Instagram (1080×1350). Si son muchos repuestos salen varias imágenes para un carrusel."
                    accion={
                        <select aria-label="Precio de la imagen" value={imagen} onChange={(e) => setImagen(e.target.value as "contado" | "lote")} className={control}>
                            <option value="contado">Precio de contado (-{descPieza} %)</option>
                            <option value="lote">Precio de lote (-{descLote} %)</option>
                        </select>
                    }
                >
                    <ImagenLiquidacion
                        items={enLote.map((a) => ({
                            codigo: a.codigo, nombre: a.nombre, marca: a.marca, precioNormal: a.precio, disponible: a.liquidar,
                            precio: precioCon(a, imagen === "contado" ? descPieza : descLote, pisoCosto),
                        }))}
                        descuento={imagen === "contado" ? descPieza : descLote}
                        tipoPrecio={imagen}
                        datosAl={datos.datosAl}
                    />
                </Panel>
                </div>
            )}

            <Panel
                titulo="Repuestos a liquidar"
                detalle={`Del que más dinero tiene parado al que menos. Quita del lote los que no quieras ofrecer. Datos de Valery al ${fecha(datos.datosAl)}.`}
                accion={
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={excelClientes} className={boton}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel para clientes</button>
                        <button type="button" onClick={excelInterno} className={boton}><Download className="h-3.5 w-3.5" /> Excel interno</button>
                        <button type="button" onClick={() => setImagen(imagen ? null : "contado")} className={boton}><ImageIcon className="h-3.5 w-3.5" /> {imagen ? "Ocultar imagen" : "Imagen para redes"}</button>
                    </div>
                }
            >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="relative">
                        <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Código, repuesto, familia o marca" className={cn(control, "w-64 pl-8")} />
                    </span>
                    <select aria-label="Motivo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={control}>
                        <option value="todos">Todos</option>
                        <option value="sin_ventas">Sin ventas en 12 meses</option>
                        <option value="sobre_stock">Sobre-stock</option>
                    </select>
                    <button type="button" onClick={() => todos(true)} className={boton}>Incluir todos</button>
                    <button type="button" onClick={() => todos(false)} className={boton}>Quitar todos</button>
                    <span className="text-xs text-muted-foreground">{num(enLote.length)} de {num(visibles.length)} en el lote</span>
                </div>
                <Tabla>
                    <thead>
                        <tr>
                            <th className={th}></th><th className={th}>Código</th><th className={th}>Repuesto</th><th className={th}>Motivo</th>
                            <th className={thNum}>A liquidar</th><th className={thNum}>Costo</th><th className={thNum}>Precio normal</th>
                            <th className={thNum}>Contado</th><th className={thNum}>Lote</th><th className={thNum}>Total lote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((a) => {
                            const incluido = !fuera.has(a.productoId);
                            const pPieza = precioCon(a, descPieza, pisoCosto);
                            const pLote = precioCon(a, descLote, pisoCosto);
                            return (
                                <tr key={a.productoId} className={cn(!incluido && "text-muted-foreground")}>
                                    <td className={td}><input type="checkbox" aria-label={`Incluir ${a.codigo} en el lote`} checked={incluido} onChange={() => alternar(a.productoId)} /></td>
                                    <td className={tdCodigo}>{a.codigo}{a.ref && <span className="block">{a.ref}</span>}</td>
                                    <td className={td}>
                                        <span className="line-clamp-2">{a.nombre}</span>
                                        <span className="block text-xs text-muted-foreground">{[a.marca && `${a.marca}${a.origen ? ` (${a.origen})` : ""}`, a.familia].filter(Boolean).join(" · ")}</span>
                                    </td>
                                    <td className={cn(td, "whitespace-nowrap text-xs")}>
                                        {a.tipo === "sin_ventas" ? (
                                            <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Sin ventas 12 m</span>
                                        ) : (
                                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">Stock para {decimal(a.mesesDeStock ?? 0, 0)} meses</span>
                                        )}
                                        <span className="mt-1 block text-muted-foreground">Últ. venta {fecha(a.ultimaVenta)}</span>
                                    </td>
                                    <td className={cn(tdNum, "font-semibold")}>{num(a.liquidar)}<span className="block text-[11px] font-normal text-muted-foreground">de {num(a.stock)}</span></td>
                                    <td className={tdNum}>{usd(a.costo)}</td>
                                    <td className={tdNum}>{a.precio ? usd(a.precio) : "—"}</td>
                                    <td className={cn(tdNum, pPieza <= a.costo + 0.005 && "text-amber-700 dark:text-amber-300")}>{usd(pPieza)}</td>
                                    <td className={cn(tdNum, pLote <= a.costo + 0.005 && "text-amber-700 dark:text-amber-300")}>{usd(pLote)}</td>
                                    <td className={cn(tdNum, "font-semibold")}>{usd(a.liquidar * pLote)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Tabla>
            </Panel>
        </div>
    );
}
