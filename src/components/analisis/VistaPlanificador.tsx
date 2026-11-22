"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Save } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PedidosEnCamino } from "./PedidosEnCamino";
import { Confianza, ListaProveedor, OpcionCruce, SelectorArticulo } from "./ListaProveedor";
import { ArticuloProveedor, excelParaProveedor } from "./exportarPedido";
import { BarraCelda, EstadoCarga, mensajeError, FilaKpis, Kpi, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { decimal, fecha, num, pct, usd } from "./formato";

type Prioridad = "clave_cero" | "clave" | "normal";

interface Linea {
    productoId: number; codigo: string; nombre: string; familia: string | null; ref: string | null; prioridad: Prioridad;
    stock: number; enCamino: number; ventaMes: number; clientes: number; necesidad: number; comprar: number; parcial: boolean;
    costo: number; costoFecha: string; costoAnterior: number | null; fuenteCosto: "lista" | "compra";
    precio: number; inversion: number; margen: number; acumulado: number;
    masBarato: { proveedor: string; costo: number } | null;
    articulo: ArticuloProveedor & { revisar: boolean };
    /** Nuestra marca y origen (modelo de Valery) y si al proveedor se le pide otra marca. */
    marca: string | null; origen: string | null; otraMarca: boolean;
    /** Cruce con la lista del proveedor (null si no tiene lista cargada). */
    confianza: Confianza | null; opciones: OpcionCruce[];
    /** Lo que sugirió el planificador (comprar puede haberlo cambiado la persona). */
    sugerido?: number;
}
interface ResumenProveedor {
    proveedorId: number; proveedor: string; transito: number; dias: number; repuestos: number;
    clavesCero: number; clavesCeroPosibles: number; inversion: number; margen: number; necesidad: number;
    fuera: { repuestos: number; inversion: number; clavesCero: number };
    lista: { id: number; fecha: string } | null;
}
interface Datos {
    periodo: { desde: string; hasta: string };
    disponible: { cuentas: { numero: string; nombre: string; saldo: number }[]; total: number };
    monto: number; minimo: number; alcanza: boolean;
    cobertura: number; coberturas: number[];
    enCamino: { pedidos: number; monto: number };
    resumen: { claves: number; clavesCero: number; clavesSinProveedor: number; puntuales: number };
    proveedores: ResumenProveedor[];
    todosProveedores: { id: number; nombre: string }[];
    pedido: (ResumenProveedor & { lineas: Linea[]; tramos: { desde: number; hasta: number; margen: number }[] }) | null;
}

const ETIQUETA: Record<Prioridad, string> = { clave_cero: "Clave en cero", clave: "Clave", normal: "Margen" };
const TONO: Record<Prioridad, string> = {
    clave_cero: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    clave: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    normal: "bg-muted text-muted-foreground",
};
const control = "rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground";

/** Excel interno del pedido (con nuestros códigos, prioridad y margen), una fila por repuesto. */
async function exportarExcel(pedido: NonNullable<Datos["pedido"]>, hasta: string) {
    const XLSX = await import("xlsx");
    const filas = pedido.lineas.map((l) => ({
        Prioridad: ETIQUETA[l.prioridad],
        Código: l.codigo,
        "Número de pieza del proveedor": l.articulo?.numeroPieza ?? "",
        Ref: l.ref ?? "",
        Repuesto: l.nombre,
        "Nuestra marca": l.marca ?? "",
        "Marca del proveedor": l.articulo?.marca ?? "",
        Familia: l.familia ?? "",
        Stock: l.stock,
        "En camino": l.enCamino,
        "Vende al mes": Number(l.ventaMes.toFixed(1)),
        "Clientes (24 m)": l.clientes,
        Necesita: l.necesidad,
        Sugerido: l.sugerido ?? l.comprar,
        Comprar: l.comprar,
        "Costo unitario": l.costo,
        "Fecha del costo": l.costoFecha?.slice(0, 10) ?? "",
        Inversión: Number(l.inversion.toFixed(2)),
        "Margen esperado": Number(l.margen.toFixed(2)),
        "Más barato en": l.masBarato ? `${l.masBarato.proveedor} (${l.masBarato.costo})` : "",
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedido");
    const nombre = pedido.proveedor.replace(/[^\w]+/g, "_").replace(/_+$/, "");
    XLSX.writeFile(libro, `Pedido_interno_${nombre}_${hasta}.xlsx`);
}

export function VistaPlanificador() {
    const [cobertura, setCobertura] = useState(30);
    const [proveedor, setProveedor] = useState("");
    // null = el saldo disponible en bancos; un número = el monto que escribió el usuario
    const [monto, setMonto] = useState<number | null>(null);
    const [montoTexto, setMontoTexto] = useState("");
    // Sube al guardar, anular o cerrar un pedido: recalcula el planificador y la lista de pedidos
    const [recarga, setRecarga] = useState(0);
    const [guardar, setGuardar] = useState<"nada" | "confirmar" | "enviando">("nada");
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
    // Cantidades que cambió la persona en el pedido sugerido, por "proveedor:código" (texto del campo)
    const [cantidades, setCantidades] = useState<Record<string, string>>({});

    const ruta = `planificador?cobertura=${cobertura}${monto != null ? `&monto=${monto}` : ""}${proveedor ? `&proveedor=${proveedor}` : ""}&r=${recarga}`;
    const { datos, error, cargando } = useAnalitica<Datos>(ruta, { conservar: true });

    /** Guarda el pedido como "en camino": desde ese momento el planificador lo descuenta. */
    const guardarPedido = async (pedido: NonNullable<Datos["pedido"]>) => {
        setGuardar("enviando");
        try {
            const r = await api.post("/analitica/pedidos", {
                proveedorId: pedido.proveedorId,
                lineas: pedido.lineas.filter((l) => l.comprar > 0).map((l) => ({ codigo: l.codigo, cantidad: l.comprar, costo: l.costo, articulo: l.articulo })),
            });
            setAviso({ ok: true, texto: `Pedido ${r.data.numero} a ${r.data.proveedor} guardado (${num(r.data.repuestos)} repuestos, ${usd(r.data.total)}). Ya cuenta como en camino.` });
            setCantidades({});
            setRecarga((n) => n + 1);
        } catch (e) {
            setAviso({ ok: false, texto: mensajeError(e, "No se pudo guardar el pedido.") });
        } finally {
            setGuardar("nada");
        }
    };

    const aplicarMonto = () => {
        const valor = Number(montoTexto.replace(/[^\d.]/g, ""));
        setMonto(montoTexto.trim() && valor > 0 ? valor : null);
    };

    const controles = (
        <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Monto a invertir (USD)
                <span className="flex gap-1">
                    <input
                        id="monto-planificador"
                        inputMode="decimal"
                        placeholder={datos ? usd(datos.disponible.total) : "Saldo en bancos"}
                        value={montoTexto}
                        onChange={(e) => setMontoTexto(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && aplicarMonto()}
                        onBlur={aplicarMonto}
                        className={cn(control, "w-36 font-mono")}
                    />
                    {monto != null && (
                        <button type="button" onClick={() => { setMontoTexto(""); setMonto(null); }} className="rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-foreground">
                            Usar saldo
                        </button>
                    )}
                </span>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Proveedor
                <select id="proveedor-planificador" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={control}>
                    <option value="">El que más conviene</option>
                    {datos?.proveedores.map((p) => <option key={p.proveedorId} value={String(p.proveedorId)}>{p.proveedor}</option>)}
                </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Cubrir después de que llegue
                <select id="cobertura-planificador" value={cobertura} onChange={(e) => setCobertura(Number(e.target.value))} className={control}>
                    {(datos?.coberturas ?? [15, 30, 45, 60, 90]).map((c) => <option key={c} value={c}>{c} días de venta</option>)}
                </select>
            </label>
        </div>
    );

    if (!datos) {
        return (
            <div className="space-y-5">
                <Panel titulo="Planificador de compras">{controles}</Panel>
                <EstadoCarga cargando={cargando} error={error} />
            </div>
        );
    }

    // El pedido con las cantidades que eligió la persona: el planificador sugiere, la persona decide
    const base = datos.pedido;
    const llave = (codigo: string) => `${base?.proveedorId}:${codigo}`;
    let acumuladoAjustado = 0;
    const lineasAjustadas = (base?.lineas ?? []).map((l) => {
        const texto = cantidades[llave(l.codigo)];
        const comprar = texto == null ? l.comprar : Math.max(0, Math.floor(Number(texto) || 0));
        const inversion = comprar * l.costo;
        acumuladoAjustado += inversion;
        return { ...l, sugerido: l.comprar, comprar, inversion, margen: comprar * (l.precio - l.costo), acumulado: acumuladoAjustado };
    });
    const conCantidad = lineasAjustadas.filter((l) => l.comprar > 0);
    const p = base ? {
        ...base,
        lineas: lineasAjustadas,
        repuestos: conCantidad.length,
        clavesCero: conCantidad.filter((l) => l.prioridad === "clave_cero").length,
        inversion: acumuladoAjustado,
        margen: lineasAjustadas.reduce((t, l) => t + l.margen, 0),
    } : null;
    const hayCambios = lineasAjustadas.some((l) => l.comprar !== l.sugerido);
    /** Suma o resta a la cantidad elegida (parte de lo último elegido, no de lo que muestra la pantalla). */
    const sumar = (codigo: string, sugerido: number, delta: number) =>
        setCantidades((c) => {
            const actual = c[llave(codigo)] != null ? Number(c[llave(codigo)]) || 0 : sugerido;
            return { ...c, [llave(codigo)]: String(Math.max(0, actual + delta)) };
        });
    const maxTramo = Math.max(...(p?.tramos.map((t) => t.margen) ?? [0]));

    return (
        <div className="space-y-5">
            <Panel
                titulo={cargando ? "Planificador de compras · recalculando…" : "Planificador de compras"}
                detalle={`Arma un pedido a un solo proveedor con el monto disponible: primero los repuestos clave que están en cero, después los que dejan más margen por dólar. Demanda de los últimos 24 meses (el último año pesa el doble), corregida por los días en cero; las ventas puntuales no cuentan.`}
            >
                {controles}
            </Panel>

            {!datos.alcanza && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    El monto ({usd(datos.monto)}) no llega al mínimo de {usd(datos.minimo)} por pedido. Conviene esperar el próximo flujo de caja.
                </div>
            )}

            <FilaKpis>
                <Kpi
                    titulo="Disponible en bancos"
                    valor={usd(datos.disponible.total)}
                    detalle={monto != null ? `Planificando con ${usd(datos.monto)}` : "Planificando con este saldo"}
                    extra={[
                        ...datos.disponible.cuentas.map((c) => `${c.nombre}: ${usd(c.saldo)}`),
                        ...(datos.enCamino.pedidos ? [`En camino: ${usd(datos.enCamino.monto)} en ${num(datos.enCamino.pedidos)} pedido${datos.enCamino.pedidos === 1 ? "" : "s"}`] : []),
                    ]}
                />
                <Kpi
                    titulo="Pedido propuesto"
                    valor={usd(p?.inversion)}
                    detalle={p ? `${num(p.repuestos)} repuestos a ${p.proveedor}` : "Sin pedido"}
                    alerta={!!p && p.inversion > datos.monto + 0.005}
                    extra={p ? [
                        `Llega en unos ${num(p.transito)} días`,
                        ...(hayCambios ? [`Con tus cantidades (sugerido: ${usd(base?.inversion)})`] : []),
                        ...(p.inversion > datos.monto + 0.005 ? [`Se pasa del monto por ${usd(p.inversion - datos.monto)}`] : []),
                    ] : undefined}
                />
                <Kpi
                    titulo="Margen esperado"
                    valor={usd(p?.margen)}
                    detalle={p && p.inversion ? `${pct(p.margen / p.inversion)} sobre lo invertido` : undefined}
                    extra={["Si se vende todo al precio promedio"]}
                />
                <Kpi
                    titulo="Clave en cero que repone"
                    valor={`${num(p?.clavesCero)} de ${num(datos.resumen.clavesCero)}`}
                    detalle={`${num(datos.resumen.claves)} repuestos clave en total`}
                    alerta={(p?.fuera.clavesCero ?? 0) > 0}
                    extra={datos.resumen.clavesSinProveedor ? [`${num(datos.resumen.clavesSinProveedor)} sin proveedor activo`] : undefined}
                />
            </FilaKpis>

            {aviso && (
                <div className={cn("flex items-center gap-2 rounded-lg border px-4 py-3 text-sm", aviso.ok ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : "border-red-500 text-red-700 dark:text-red-300")}>
                    {aviso.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{aviso.texto}</span>
                    <button type="button" onClick={() => setAviso(null)} className="text-xs text-muted-foreground hover:text-foreground">Cerrar</button>
                </div>
            )}

            <PedidosEnCamino recarga={recarga} onCambio={() => setRecarga((n) => n + 1)} />

            <Panel
                titulo="Proveedores"
                detalle={`El mismo monto con cada proveedor, ordenado por los repuestos clave en cero que repone y después por margen. "Para cubrir todo" es lo que costaría su pedido completo. Toca uno para ver su pedido.`}
            >
                <Tabla>
                    <thead><tr><th className={th}>Proveedor</th><th className={thNum}>Tránsito</th><th className={thNum}>Repuestos</th><th className={thNum}>Clave en cero</th><th className={thNum}>Inversión</th><th className={thNum}>Margen esp.</th><th className={thNum}>Para cubrir todo</th></tr></thead>
                    <tbody>
                        {datos.proveedores.map((x) => {
                            const elegido = p?.proveedorId === x.proveedorId;
                            return (
                                <tr
                                    key={x.proveedorId}
                                    onClick={() => setProveedor(String(x.proveedorId))}
                                    className={cn("cursor-pointer hover:bg-muted", elegido && "bg-muted font-medium")}
                                >
                                    <td className={td}>{x.proveedor}{elegido && <span className="ml-2 text-xs text-primary">elegido</span>}</td>
                                    <td className={tdNum}>{num(x.transito)} d</td>
                                    <td className={tdNum}>{num(x.repuestos)}</td>
                                    <td className={tdNum}>{num(x.clavesCero)}</td>
                                    <td className={tdNum}>{usd(x.inversion)}</td>
                                    <td className={tdNum}>{usd(x.margen)}</td>
                                    <td className={tdNum}>{usd(x.necesidad)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Tabla>
            </Panel>

            {p && (
                <Panel
                    titulo={`Pedido a ${p.proveedor}`}
                    detalle={`Compra para ${num(p.transito)} días de tránsito más ${num(datos.cobertura)} de venta: ${num(p.dias)} días, menos el stock y lo que ya viene en camino. ${p.lista ? `Precios de su lista del ${fecha(p.lista.fecha)} (o de la última compra si no está en la lista).` : "Costo de la última compra a este proveedor (sube su lista para usar sus precios y números de pieza)."}${p.lista && p.lineas.some((l) => l.confianza === "revisar" || l.confianza === "sin_articulo") ? ` ${num(p.lineas.filter((l) => l.confianza === "revisar" || l.confianza === "sin_articulo").length)} repuestos marcados en ámbar o gris: confirma con qué artículo de su lista se piden.` : ""}${p.fuera.repuestos ? ` Quedan fuera ${num(p.fuera.repuestos)} repuestos por ${usd(p.fuera.inversion)} que no alcanzaron.` : " El monto alcanza para todo lo que necesita."}`}
                    accion={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {guardar === "confirmar" ? (
                                <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                                    ¿Guardar {num(p.repuestos)} repuestos por {usd(p.inversion)} a {p.proveedor} como pedido enviado?
                                    <button type="button" onClick={() => guardarPedido(p)} className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground">Sí, guardar</button>
                                    <button type="button" onClick={() => setGuardar("nada")} className="rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground">No</button>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    disabled={guardar === "enviando"}
                                    onClick={() => setGuardar("confirmar")}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                                >
                                    <Save className="h-3.5 w-3.5" /> {guardar === "enviando" ? "Guardando…" : "Guardar pedido"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => excelParaProveedor(p.lineas.map((l) => ({ codigo: l.codigo, nombre: l.nombre, cantidad: l.comprar, costo: l.costo, articulo: l.articulo })), p.proveedor, datos.periodo.hasta)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel para el proveedor
                            </button>
                            <button
                                type="button"
                                onClick={() => exportarExcel(p, datos.periodo.hasta)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                            >
                                <Download className="h-3.5 w-3.5" /> Excel interno
                            </button>
                        </div>
                    }
                >
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Las cantidades son una sugerencia: cámbialas en la columna «Comprar» (0 para sacar un repuesto). Los totales, el Excel y el pedido guardado usan las tuyas.</span>
                        {hayCambios && (
                            <button type="button" onClick={() => setCantidades({})} className="rounded-md border border-border px-2 py-1 font-medium text-foreground hover:bg-muted">
                                Volver a las sugeridas
                            </button>
                        )}
                    </div>
                    <Tabla>
                        <thead><tr><th className={th}>Prioridad</th><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Stock</th><th className={thNum}>Vende / mes</th><th className={thNum}>Comprar</th><th className={thNum}>Costo</th><th className={thNum}>Inversión</th><th className={thNum}>Margen esp.</th><th className={thNum}>Acumulado</th></tr></thead>
                        <tbody>
                            {p.lineas.map((l) => (
                                <tr key={l.codigo} className={cn(l.comprar === 0 && "text-muted-foreground")}>
                                    <td className={td}><span className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", TONO[l.prioridad])}>{ETIQUETA[l.prioridad]}</span></td>
                                    <td className={tdCodigo}>{l.codigo}{l.ref && <span className="block">{l.ref}</span>}</td>
                                    <td className={td}>
                                        <span className="line-clamp-2">{l.nombre}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {l.marca ? <>Nuestra marca: <span className="font-medium text-foreground">{l.marca}{l.origen ? ` (${l.origen})` : ""}</span> · </> : null}
                                            {num(l.clientes)} clientes en 24 meses
                                        </span>
                                        {l.confianza ? (
                                            <SelectorArticulo
                                                proveedorId={p.proveedorId}
                                                proveedor={p.proveedor}
                                                producto={{ productoId: l.productoId, codigo: l.codigo, nombre: l.nombre, marca: l.marca }}
                                                articulo={l.articulo.revisar ? null : l.articulo}
                                                confianza={l.confianza}
                                                opciones={l.opciones}
                                                onCambio={() => setRecarga((n) => n + 1)}
                                            />
                                        ) : (
                                            <span className="block text-xs text-muted-foreground">
                                                Se pide como <span className="font-mono">{l.articulo.numeroPieza}</span> (número Toyota; sube su lista para usar sus números)
                                            </span>
                                        )}
                                        {l.masBarato && <span className="block text-xs text-amber-700 dark:text-amber-300">Más barato en {l.masBarato.proveedor}: {usd(l.masBarato.costo)}</span>}
                                    </td>
                                    <td className={cn(tdNum, l.stock <= 0 && "text-red-600 dark:text-red-400")}>
                                        {num(l.stock)}
                                        {l.enCamino > 0 && <span className="block text-[11px] text-blue-700 dark:text-blue-300">+{num(l.enCamino)} en camino</span>}
                                    </td>
                                    <td className={tdNum}>{decimal(l.ventaMes)}</td>
                                    <td className={cn(tdNum, "whitespace-nowrap")}>
                                        <span className="inline-flex items-center gap-1">
                                            <button
                                                type="button" aria-label={`Una menos de ${l.codigo}`} disabled={l.comprar === 0}
                                                onClick={() => sumar(l.codigo, l.sugerido ?? l.comprar, -1)}
                                                className="h-6 w-6 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                                            >−</button>
                                            <input
                                                inputMode="numeric" aria-label={`Cantidad a comprar de ${l.codigo}`}
                                                value={cantidades[llave(l.codigo)] ?? String(l.comprar)}
                                                onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCantidades((c) => ({ ...c, [llave(l.codigo)]: v })); }}
                                                className={cn("w-14 rounded border bg-card px-1.5 py-0.5 text-right font-mono font-semibold", l.comprar !== l.sugerido ? "border-primary" : "border-border")}
                                            />
                                            <button
                                                type="button" aria-label={`Una más de ${l.codigo}`}
                                                onClick={() => sumar(l.codigo, l.sugerido ?? l.comprar, 1)}
                                                className="h-6 w-6 rounded border border-border text-muted-foreground hover:text-foreground"
                                            >+</button>
                                        </span>
                                        {l.comprar !== l.sugerido ? (
                                            <span className="block text-[11px] text-primary">sugerido {num(l.sugerido)}</span>
                                        ) : l.parcial ? (
                                            <span className="block text-[11px] text-muted-foreground">de {num(l.necesidad)} necesarias</span>
                                        ) : null}
                                    </td>
                                    <td className={cn(tdNum, "whitespace-nowrap")}>
                                        {usd(l.costo)}
                                        <span className="block text-[11px] text-muted-foreground">{l.fuenteCosto === "lista" ? "su lista" : `compra ${fecha(l.costoFecha)}`}</span>
                                        {l.fuenteCosto === "lista" && l.costoAnterior != null && Math.abs(l.costo / l.costoAnterior - 1) > 0.01 && (
                                            <span className={cn("block text-[11px]", l.costo > l.costoAnterior ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300")}>
                                                antes {usd(l.costoAnterior)}
                                            </span>
                                        )}
                                    </td>
                                    <td className={tdNum}>{usd(l.inversion)}</td>
                                    <td className={tdNum}>{usd(l.margen)}</td>
                                    <td className={cn(tdNum, "text-muted-foreground")}>{usd(l.acumulado)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            )}

            <ListaProveedor
                key={p?.proveedorId ?? "ninguno"}
                proveedores={datos.todosProveedores}
                proveedorInicial={p?.proveedorId ?? null}
                onCambio={() => setRecarga((n) => n + 1)}
            />

            {p && p.tramos.length > 1 && (
                <Panel titulo="Margen por cada $1.000" detalle="Cuánto margen agrega cada tramo del pedido. Cuando baja mucho, invertir más ya rinde menos.">
                    <Tabla>
                        <thead><tr><th className={th}>Tramo</th><th className={thNum}>Margen esperado</th></tr></thead>
                        <tbody>
                            {p.tramos.map((t) => (
                                <tr key={t.desde}>
                                    <td className={cn(td, "whitespace-nowrap")}>{usd(t.desde)} – {usd(Math.min(t.hasta, p.inversion))}</td>
                                    <td className={td}><BarraCelda valor={t.margen} maximo={maxTramo} texto={usd(t.margen)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            )}
        </div>
    );
}
