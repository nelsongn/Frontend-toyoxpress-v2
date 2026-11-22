"use client";

import { useState } from "react";
import { Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EstadoCarga, mensajeError, Panel, Tabla, td, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, usd } from "./formato";
import { adivinarColumnas, CAMPOS, Campo, Columnas, extraerArticulos, filaEncabezado, leerArchivo, nombresColumnas } from "./listaExcel";

interface Opcion { codigo: string | null; numeroPieza: string; descripcion: string | null; marca: string | null; pais: string | null; precio: number }
interface Dudosa { productoId: number; codigo: string; nombre: string; venta12: number; costo: number | null; opciones: Opcion[] }
interface DatosLista {
    lista: { id: number; archivo: string | null; articulos: number; subidaPor: string | null; subidaEn: string } | null;
    columnas: Partial<Record<Campo, string>> | null;
    resumen: { auto: number; manual: number; dudosas: number; ninguna: number } | null;
    dudosas: Dudosa[];
}
type Celda = string | number | boolean | null | undefined;

const control = "rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground";
const boton = "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60";
const botonPrimario = "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60";

/**
 * Lista de precios de un proveedor: se sube su Excel tal como lo manda, se cruza con nuestros
 * repuestos y se eligen una vez las equivalencias que el sistema no pudo decidir solo.
 */
export function ListaProveedor({ proveedores, proveedorInicial, onCambio }: {
    proveedores: { id: number; nombre: string }[]; proveedorInicial: number | null; onCambio: () => void;
}) {
    const [proveedorId, setProveedorId] = useState<number | null>(proveedorInicial);
    const [recarga, setRecarga] = useState(0);
    const { datos, error, cargando } = useAnalitica<DatosLista>(proveedorId ? `listas/${proveedorId}?r=${recarga}` : null, { conservar: true });

    // Subida: archivo leído, fila de encabezados y qué columna es cada dato
    const [archivo, setArchivo] = useState<{ nombre: string; filas: Celda[][]; encabezado: number; columnas: Columnas } | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
    const [verDudosas, setVerDudosas] = useState(false);
    const [elecciones, setElecciones] = useState<Record<number, Opcion | "ninguna">>({});

    const elegirArchivo = async (f: File | undefined) => {
        setAviso(null);
        if (!f) return;
        try {
            const filas = await leerArchivo(f);
            const encabezado = filaEncabezado(filas);
            if (encabezado < 0) {
                setAviso({ ok: false, texto: "No encontré la fila de encabezados (con “Código” y “Precio”). Revisa el archivo." });
                return;
            }
            setArchivo({ nombre: f.name, filas, encabezado, columnas: adivinarColumnas(filas[encabezado], datos?.columnas) });
        } catch {
            setAviso({ ok: false, texto: "No se pudo leer el archivo. Debe ser Excel (.xlsx, .xls) o CSV." });
        }
    };

    const articulos = archivo ? extraerArticulos(archivo.filas, archivo.encabezado, archivo.columnas) : [];
    const faltaRequerido = archivo ? CAMPOS.some((c) => c.requerido && archivo.columnas[c.id] == null) : true;

    const subir = async () => {
        if (!archivo || !proveedorId || faltaRequerido || !articulos.length) return;
        setSubiendo(true);
        try {
            const r = await api.post("/analitica/listas", {
                proveedorId, archivo: archivo.nombre, articulos,
                columnas: nombresColumnas(archivo.filas[archivo.encabezado], archivo.columnas),
            });
            setAviso({ ok: true, texto: `Lista de ${r.data.proveedor} cargada: ${num(r.data.articulos)} artículos.` });
            setArchivo(null);
            setRecarga((n) => n + 1);
            onCambio();
        } catch (e) {
            setAviso({ ok: false, texto: mensajeError(e, "No se pudo subir la lista.") });
        } finally {
            setSubiendo(false);
        }
    };

    const guardarElecciones = async () => {
        if (!proveedorId) return;
        const decisiones = Object.entries(elecciones).map(([productoId, e]) => (
            e === "ninguna" ? { productoId: Number(productoId), codigo: null, numeroPieza: null }
                : { productoId: Number(productoId), codigo: e.codigo, numeroPieza: e.numeroPieza }));
        if (!decisiones.length) return;
        try {
            await api.post("/analitica/equivalencias", { proveedorId, decisiones });
            setAviso({ ok: true, texto: `Guardadas ${num(decisiones.length)} equivalencias.` });
            setElecciones({});
            setRecarga((n) => n + 1);
            onCambio();
        } catch (e) {
            setAviso({ ok: false, texto: mensajeError(e, "No se pudieron guardar las equivalencias.") });
        }
    };

    const encabezados = archivo ? archivo.filas[archivo.encabezado] : [];
    const muestra = archivo ? archivo.filas.slice(archivo.encabezado + 1).filter((f) => f.some((c) => c != null && c !== "")).slice(0, 3) : [];

    return (
        <Panel
            titulo="Lista de precios del proveedor"
            detalle="Sube el Excel que manda el proveedor tal cual. Se cruza con nuestros repuestos por el número Toyota y el precio de la última compra; el planificador usa entonces su precio actual y su número de pieza, y también propone repuestos que tiene aunque nunca se le hayan comprado."
            accion={
                <select
                    aria-label="Proveedor de la lista"
                    value={proveedorId ?? ""}
                    onChange={(e) => { setProveedorId(e.target.value ? Number(e.target.value) : null); setArchivo(null); setElecciones({}); setAviso(null); }}
                    className={control}
                >
                    <option value="">Elige el proveedor…</option>
                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
            }
        >
            {!proveedorId ? (
                <p className="text-sm text-muted-foreground">Elige el proveedor para ver o subir su lista.</p>
            ) : !datos ? (
                <EstadoCarga cargando={cargando} error={error} />
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm">
                            {datos.lista ? (
                                <>Última lista: <span className="font-medium">{datos.lista.archivo ?? "sin nombre"}</span> · {num(datos.lista.articulos)} artículos · {fecha(datos.lista.subidaEn)}{datos.lista.subidaPor ? ` · ${datos.lista.subidaPor}` : ""}</>
                            ) : (
                                <span className="text-muted-foreground">Este proveedor todavía no tiene lista cargada.</span>
                            )}
                        </p>
                        <label className={cn(boton, "cursor-pointer")}>
                            <Upload className="h-3.5 w-3.5" /> {datos.lista ? "Subir lista nueva" : "Subir lista"}
                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
                        </label>
                    </div>

                    {aviso && <p className={cn("text-sm", aviso.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>{aviso.texto}</p>}

                    {archivo && (
                        <div className="space-y-3 rounded-lg border border-primary p-4">
                            <p className="text-sm font-medium">{archivo.nombre}: revisa qué columna es cada dato</p>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {CAMPOS.map((c) => (
                                    <label key={c.id} className="flex flex-col gap-1 text-xs text-muted-foreground">
                                        {c.nombre}{c.requerido ? " *" : ""}
                                        <select
                                            value={archivo.columnas[c.id] ?? ""}
                                            onChange={(e) => setArchivo({ ...archivo, columnas: { ...archivo.columnas, [c.id]: e.target.value === "" ? null : Number(e.target.value) } })}
                                            className={control}
                                        >
                                            <option value="">— No viene —</option>
                                            {encabezados.map((h, i) => <option key={i} value={i}>{String(h ?? `Columna ${i + 1}`)}</option>)}
                                        </select>
                                    </label>
                                ))}
                            </div>
                            <Tabla>
                                <thead><tr>{CAMPOS.filter((c) => archivo.columnas[c.id] != null).map((c) => <th key={c.id} className={th}>{c.nombre}</th>)}</tr></thead>
                                <tbody>
                                    {muestra.map((f, i) => (
                                        <tr key={i}>{CAMPOS.filter((c) => archivo.columnas[c.id] != null).map((c) => <td key={c.id} className={td}>{String(f[archivo.columnas[c.id]!] ?? "")}</td>)}</tr>
                                    ))}
                                </tbody>
                            </Tabla>
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" disabled={subiendo || faltaRequerido || !articulos.length} onClick={subir} className={botonPrimario}>
                                    {subiendo ? "Subiendo…" : `Subir ${num(articulos.length)} artículos`}
                                </button>
                                <button type="button" onClick={() => setArchivo(null)} className={boton}>Cancelar</button>
                                {faltaRequerido && <span className="text-xs text-red-600 dark:text-red-400">Falta indicar el número de pieza y el precio.</span>}
                            </div>
                        </div>
                    )}

                    {datos.resumen && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <span><span className="font-semibold">{num(datos.resumen.auto + datos.resumen.manual)}</span> repuestos nuestros ya cruzados</span>
                            {datos.resumen.ninguna > 0 && <span className="text-muted-foreground">{num(datos.resumen.ninguna)} marcados como que no los tiene</span>}
                            {datos.resumen.dudosas > 0 && (
                                <button type="button" onClick={() => setVerDudosas(!verDudosas)} className={boton}>
                                    {verDudosas ? "Ocultar" : `Elegir ${num(datos.resumen.dudosas)} con varias opciones`}
                                </button>
                            )}
                        </div>
                    )}

                    {verDudosas && datos.dudosas.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Del que más vendemos al que menos. Elige cuál de sus artículos es el nuestro (el precio de nuestra última compra ayuda a reconocerlo) o marca que no lo tiene. Se guarda una sola vez.</p>
                            <Tabla>
                                <thead><tr><th className={th}>Nuestro repuesto</th><th className={thNum}>Última compra</th><th className={th}>Opciones del proveedor</th></tr></thead>
                                <tbody>
                                    {datos.dudosas.map((d) => {
                                        const elegida = elecciones[d.productoId];
                                        return (
                                            <tr key={d.productoId}>
                                                <td className={td}>
                                                    <span className="block font-mono text-xs text-muted-foreground">{d.codigo}</span>
                                                    <span className="line-clamp-2">{d.nombre}</span>
                                                    <span className="block text-xs text-muted-foreground">Venta 12 m: {usd(d.venta12)}</span>
                                                </td>
                                                <td className={tdNum}>{d.costo != null ? usd(d.costo) : "—"}</td>
                                                <td className={td}>
                                                    <div className="flex flex-col gap-1">
                                                        {d.opciones.map((o) => (
                                                            <label key={`${o.codigo}-${o.numeroPieza}`} className="flex cursor-pointer items-start gap-2 text-xs">
                                                                <input
                                                                    type="radio" name={`eq-${d.productoId}`} className="mt-0.5"
                                                                    checked={elegida !== "ninguna" && elegida?.numeroPieza === o.numeroPieza && elegida?.codigo === o.codigo}
                                                                    onChange={() => setElecciones((e) => ({ ...e, [d.productoId]: o }))}
                                                                />
                                                                <span>
                                                                    <span className="font-mono">{o.numeroPieza}</span> · {o.marca ?? "—"} {o.pais ? `(${o.pais})` : ""} · <span className="font-semibold">{usd(o.precio)}</span>
                                                                    {o.descripcion && <span className="block text-muted-foreground">{o.descripcion}</span>}
                                                                </span>
                                                            </label>
                                                        ))}
                                                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                                            <input type="radio" name={`eq-${d.productoId}`} checked={elegida === "ninguna"} onChange={() => setElecciones((e) => ({ ...e, [d.productoId]: "ninguna" }))} />
                                                            No lo tiene
                                                        </label>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Tabla>
                            <button type="button" disabled={!Object.keys(elecciones).length} onClick={guardarElecciones} className={botonPrimario}>
                                Guardar {num(Object.keys(elecciones).length)} elecciones
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Panel>
    );
}

/**
 * Busca en la lista del proveedor el artículo que corresponde a un repuesto nuestro que no se cruzó solo
 * (p. ej. lo vende con otro número) y guarda la equivalencia.
 */
export function BuscarEquivalencia({ proveedorId, producto, onListo }: {
    proveedorId: number; producto: { productoId: number; codigo: string; nombre: string }; onListo: () => void;
}) {
    const [texto, setTexto] = useState(producto.codigo.replace(/^G(?=\d)/, "").replace(/-(J|T)$/, ""));
    const [resultados, setResultados] = useState<(Opcion & { disponible: number | null })[] | null>(null);
    const [fallo, setFallo] = useState<string | null>(null);

    const buscar = async () => {
        setFallo(null);
        try {
            const r = await api.get(`/analitica/listas/${proveedorId}/buscar`, { params: { q: texto } });
            setResultados(r.data.articulos);
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo buscar."));
        }
    };
    const usar = async (o: Opcion | null) => {
        try {
            await api.post("/analitica/equivalencias", {
                proveedorId, decisiones: [{ productoId: producto.productoId, codigo: o?.codigo ?? null, numeroPieza: o?.numeroPieza ?? null }],
            });
            onListo();
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo guardar."));
        }
    };

    return (
        <div className="mt-2 space-y-2 rounded-md border border-border p-2">
            <div className="flex flex-wrap gap-1">
                <input
                    value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()}
                    placeholder="Número, código o descripción" className={cn(control, "w-48 text-xs")}
                />
                <button type="button" onClick={buscar} className={boton}><Search className="h-3.5 w-3.5" /> Buscar</button>
                <button type="button" onClick={() => usar(null)} className={boton}>No lo tiene</button>
            </div>
            {fallo && <p className="text-xs text-red-600 dark:text-red-400">{fallo}</p>}
            {resultados && !resultados.length && <p className="text-xs text-muted-foreground">Sin resultados en su lista.</p>}
            {resultados?.map((o) => (
                <div key={`${o.codigo}-${o.numeroPieza}`} className="flex items-start justify-between gap-2 text-xs">
                    <span>
                        <span className="font-mono">{o.numeroPieza}</span> · {o.marca ?? "—"} · <span className="font-semibold">{usd(o.precio)}</span>
                        {o.descripcion && <span className="block text-muted-foreground">{o.descripcion}</span>}
                    </span>
                    <button type="button" onClick={() => usar(o)} className={boton}>Usar este</button>
                </div>
            ))}
        </div>
    );
}

