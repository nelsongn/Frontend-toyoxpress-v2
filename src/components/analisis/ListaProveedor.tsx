"use client";

import { useState } from "react";
import { Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EstadoCarga, mensajeError, Panel, Tabla, td, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { fecha, num, usd } from "./formato";
import { adivinarColumnas, CAMPOS, Campo, Columnas, extraerArticulos, filaEncabezado, leerArchivo, nombresColumnas } from "./listaExcel";

// ---------------------------------------------------------------------------
// Cruce de nuestros repuestos con la lista del proveedor
// ---------------------------------------------------------------------------

export type Confianza = "confirmado" | "seguro" | "probable" | "revisar" | "sin_articulo" | "no_lo_vende";

export interface ArticuloLista {
    codigo: string | null; numeroPieza: string; descripcion: string | null;
    marca: string | null; pais: string | null; precio: number | null; disponible?: number | null;
}
export interface OpcionCruce extends ArticuloLista { mismaMarca: boolean; diferencia: number | null }

const ETIQUETA_CONFIANZA: Record<Confianza, string> = {
    confirmado: "confirmado", seguro: "seguro", probable: "probable", revisar: "confírmalo", sin_articulo: "no está en su lista", no_lo_vende: "no lo vende",
};
const TONO_CONFIANZA: Record<Confianza, string> = {
    confirmado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    seguro: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    probable: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    revisar: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    sin_articulo: "bg-muted text-muted-foreground",
    no_lo_vende: "bg-muted text-muted-foreground",
};

type ArticuloMinimo = { codigo?: string | null; numeroPieza?: string | null; marca?: string | null };
const mismo = (a: ArticuloMinimo | null | undefined, b: ArticuloMinimo | null | undefined) =>
    !!a && !!b && a.codigo === b.codigo && a.numeroPieza === b.numeroPieza;

function diferenciaTexto(d: number | null): string {
    if (d == null || !isFinite(d) || Math.abs(d) < 0.005) return "";
    return `${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)} %`;
}

/** Por qué un cruce quedó para confirmar (otra marca, precio muy distinto). */
function motivoRevisar(a: OpcionCruce | null, nuestraMarca: string | null): string {
    if (!a) return "";
    const motivos = [];
    if (nuestraMarca && !a.mismaMarca) motivos.push("otra marca");
    if (a.diferencia != null && Math.abs(a.diferencia) > 0.25) motivos.push(`precio ${diferenciaTexto(a.diferencia)}`);
    return motivos.join(" · ");
}

async function guardarDecision(proveedorId: number, productoId: number, articulo: ArticuloLista | null) {
    await api.post("/analitica/equivalencias", {
        proveedorId, decisiones: [{ productoId, codigo: articulo?.codigo ?? null, numeroPieza: articulo?.numeroPieza ?? null }],
    });
}

/**
 * "El proveedor lo vende como": el artículo de su lista elegido para nuestro repuesto, con qué tan
 * seguro es y un menú para cambiarlo, decir que no lo vende o buscar otro en su lista.
 * Lo que se elige queda guardado para siempre.
 */
export function SelectorArticulo({ proveedorId, proveedor, producto, articulo, confianza, opciones, onCambio }: {
    proveedorId: number; proveedor: string;
    producto: { productoId: number; codigo: string; nombre: string; marca: string | null };
    articulo: ArticuloMinimo | null; confianza: Confianza; opciones: OpcionCruce[]; onCambio: () => void;
}) {
    const [buscar, setBuscar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [fallo, setFallo] = useState<string | null>(null);

    const indice = opciones.findIndex((o) => mismo(o, articulo));
    const valor = confianza === "no_lo_vende" ? "ninguno" : indice >= 0 ? String(indice) : articulo ? "actual" : "";

    const elegir = async (v: string) => {
        if (v === "buscar") { setBuscar(true); return; }
        setFallo(null);
        setGuardando(true);
        try {
            await guardarDecision(proveedorId, producto.productoId, v === "ninguno" ? null : opciones[Number(v)]);
            onCambio();
        } catch (e) {
            setFallo(mensajeError(e, "No se pudo guardar."));
        } finally {
            setGuardando(false);
        }
    };

    const elegido = indice >= 0 ? opciones[indice] : null;
    const motivo = confianza === "revisar" || confianza === "probable" ? motivoRevisar(elegido, producto.marca) : "";

    return (
        <div className="mt-1 space-y-1">
            <span className="block text-[11px] text-muted-foreground">{proveedor} lo vende como</span>
            <div className="flex flex-wrap items-center gap-1.5">
                <select
                    aria-label={`Artículo de ${proveedor} para ${producto.codigo}`}
                    value={valor} disabled={guardando} onChange={(e) => elegir(e.target.value)}
                    className="max-w-full rounded-md border border-border bg-card px-1.5 py-1 text-xs text-foreground"
                >
                    {valor === "" && <option value="">— Sin artículo de su lista —</option>}
                    {valor === "actual" && articulo && <option value="actual">{articulo.numeroPieza} · {articulo.marca ?? "—"}</option>}
                    {opciones.map((o, i) => (
                        <option key={`${o.codigo}-${o.numeroPieza}`} value={String(i)}>
                            {o.numeroPieza} · {o.marca ?? "—"}{o.pais ? ` (${o.pais})` : ""} · {usd(o.precio)}{o.diferencia != null ? `  ${diferenciaTexto(o.diferencia)}` : ""}{o.mismaMarca ? " · misma marca" : ""}
                        </option>
                    ))}
                    <option value="ninguno">No lo vende</option>
                    <option value="buscar">Buscar otro en su lista…</option>
                </select>
                <span className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium", TONO_CONFIANZA[confianza])}>
                    {ETIQUETA_CONFIANZA[confianza]}{motivo ? ` · ${motivo}` : ""}
                </span>
            </div>
            {fallo && <span className="block text-[11px] text-red-600 dark:text-red-400">{fallo}</span>}
            {buscar && (
                <BuscarEquivalencia
                    proveedorId={proveedorId}
                    producto={producto}
                    onListo={() => { setBuscar(false); onCambio(); }}
                    onCerrar={() => setBuscar(false)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Panel: lista de precios del proveedor
// ---------------------------------------------------------------------------

interface Inseguro {
    productoId: number; codigo: string; nombre: string; marca: string | null; origen: string | null; venta12: number;
    costo: number | null; articulo: OpcionCruce | null; confianza: Confianza; opciones: OpcionCruce[];
}
interface DatosLista {
    lista: { id: number; archivo: string | null; articulos: number; subidaPor: string | null; subidaEn: string } | null;
    columnas: Partial<Record<Campo, string>> | null;
    resumen: { vendidos: number; confirmado: number; seguro: number; probable: number; revisar: number; no_lo_vende: number } | null;
    inseguros: Inseguro[];
}
type Celda = string | number | boolean | null | undefined;

const control = "rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground";
const boton = "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60";
const botonPrimario = "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60";

/**
 * Lista de precios de un proveedor: se sube su Excel tal como lo manda y se cruza sola con nuestros
 * repuestos. Lo inseguro se confirma en el pedido; aquí se puede revisar antes, si se quiere.
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
    const [verInseguros, setVerInseguros] = useState(false);

    const nombreProveedor = proveedores.find((p) => p.id === proveedorId)?.nombre ?? "El proveedor";

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

    const encabezados = archivo ? archivo.filas[archivo.encabezado] : [];
    const muestra = archivo ? archivo.filas.slice(archivo.encabezado + 1).filter((f) => f.some((c) => c != null && c !== "")).slice(0, 3) : [];
    const r = datos?.resumen;
    const enSuLista = r ? r.confirmado + r.seguro + r.probable + r.revisar + r.no_lo_vende : 0;

    return (
        <Panel
            titulo="Lista de precios del proveedor"
            detalle="Sube el Excel que manda el proveedor tal cual. Cada repuesto nuestro se cruza solo con el artículo más probable de su lista (misma marca, precio parecido a nuestra última compra); en el pedido ves cuál quedó y lo cambias si hace falta."
            accion={
                <select
                    aria-label="Proveedor de la lista"
                    value={proveedorId ?? ""}
                    onChange={(e) => { setProveedorId(e.target.value ? Number(e.target.value) : null); setArchivo(null); setAviso(null); setVerInseguros(false); }}
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

                    {r && (
                        <div className="space-y-2 text-sm">
                            <p>
                                De los <span className="font-semibold">{num(r.vendidos)}</span> repuestos que vendimos en 12 meses, <span className="font-semibold">{num(enSuLista)}</span> están en su lista:
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className={cn("rounded px-2 py-1 font-medium", TONO_CONFIANZA.seguro)}>{num(r.confirmado + r.seguro)} seguros o confirmados</span>
                                <span className={cn("rounded px-2 py-1 font-medium", TONO_CONFIANZA.probable)}>{num(r.probable)} probables (otra marca, precio parecido)</span>
                                <span className={cn("rounded px-2 py-1 font-medium", TONO_CONFIANZA.revisar)}>{num(r.revisar)} para confirmar (precio muy distinto)</span>
                                {r.no_lo_vende > 0 && <span className={cn("rounded px-2 py-1 font-medium", TONO_CONFIANZA.no_lo_vende)}>{num(r.no_lo_vende)} no los vende</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">Los que hay que confirmar aparecen en ámbar en el pedido; los probables solo avisan la marca. Si quieres dejar listos los de ámbar antes:</p>
                            {r.revisar > 0 && (
                                <button type="button" onClick={() => setVerInseguros(!verInseguros)} className={boton}>
                                    {verInseguros ? "Ocultar" : `Revisar los ${num(Math.min(r.revisar, datos.inseguros.length))} de más venta`}
                                </button>
                            )}
                        </div>
                    )}

                    {verInseguros && datos.inseguros.length > 0 && (
                        <Tabla>
                            <thead><tr><th className={th}>Nuestro repuesto</th><th className={thNum}>Última compra</th><th className={th}>Artículo del proveedor</th></tr></thead>
                            <tbody>
                                {datos.inseguros.map((d) => (
                                    <tr key={d.productoId}>
                                        <td className={td}>
                                            <span className="block font-mono text-xs text-muted-foreground">{d.codigo}</span>
                                            <span className="line-clamp-2">{d.nombre}</span>
                                            <span className="block text-xs font-medium">Nuestra marca: {d.marca ? `${d.marca}${d.origen ? ` (${d.origen})` : ""}` : "sin marca en Valery"}</span>
                                            <span className="block text-xs text-muted-foreground">Venta 12 m: {usd(d.venta12)}</span>
                                        </td>
                                        <td className={tdNum}>{d.costo != null ? usd(d.costo) : "—"}</td>
                                        <td className={td}>
                                            <SelectorArticulo
                                                proveedorId={proveedorId}
                                                proveedor={nombreProveedor}
                                                producto={{ productoId: d.productoId, codigo: d.codigo, nombre: d.nombre, marca: d.marca }}
                                                articulo={d.articulo} confianza={d.confianza} opciones={d.opciones}
                                                onCambio={() => { setRecarga((n) => n + 1); onCambio(); }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Tabla>
                    )}
                </div>
            )}
        </Panel>
    );
}

/**
 * Busca en la lista del proveedor el artículo que corresponde a un repuesto nuestro que no se cruzó solo
 * (p. ej. lo vende con otro número) y guarda la elección.
 */
export function BuscarEquivalencia({ proveedorId, producto, onListo, onCerrar }: {
    proveedorId: number; producto: { productoId: number; codigo: string; nombre: string }; onListo: () => void; onCerrar?: () => void;
}) {
    const [texto, setTexto] = useState(producto.codigo.replace(/^G(?=\d)/, "").replace(/-(J|T)$/, ""));
    const [resultados, setResultados] = useState<ArticuloLista[] | null>(null);
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
    const usar = async (o: ArticuloLista | null) => {
        try {
            await guardarDecision(proveedorId, producto.productoId, o);
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
                <button type="button" onClick={() => usar(null)} className={boton}>No lo vende</button>
                {onCerrar && <button type="button" onClick={onCerrar} className={boton}>Cerrar</button>}
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
