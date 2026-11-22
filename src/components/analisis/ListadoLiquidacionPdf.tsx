"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { num } from "./formato";
import { cargarImagen, lineas, numeroPublico } from "./ImagenLiquidacion";
import { bytesDeDataUrl, pdfDeImagenes } from "./pdfImagenes";

/**
 * Listado de liquidación en PDF (hoja A4) para mandarle a los clientes: los repuestos del lote con su
 * número Toyota, marca, disponible y precio. Cada hoja se dibuja con canvas y va como imagen dentro
 * del PDF, así no hace falta ninguna librería y se ve igual en cualquier lector.
 */

export interface ItemListado {
    codigo: string; nombre: string; marca: string | null; origen: string | null; familia: string | null;
    disponible: number; precioNormal: number | null; contado: number; lote: number;
}
type Precio = "contado" | "lote" | "ambos";
/**
 * Orden por niveles, como en Excel: "ordenar por" y hasta dos "luego por", cada uno con su sentido.
 * Si el primer nivel es familia, marca u origen se puede poner un título por grupo.
 */
const CAMPOS = [
    { id: "dinero", nombre: "Dinero parado", tipo: "numero" },
    { id: "numero", nombre: "Número de parte", tipo: "texto" },
    { id: "nombre", nombre: "Repuesto (nombre)", tipo: "texto" },
    { id: "familia", nombre: "Familia", tipo: "texto" },
    { id: "marca", nombre: "Marca", tipo: "texto" },
    { id: "origen", nombre: "Origen", tipo: "texto" },
    { id: "precio", nombre: "Precio", tipo: "numero" },
    { id: "disponible", nombre: "Cantidad disponible", tipo: "numero" },
] as const;
type Campo = (typeof CAMPOS)[number]["id"];
interface Nivel { campo: Campo | ""; desc: boolean }
const AGRUPABLES: Campo[] = ["familia", "marca", "origen"];
const NIVELES_INICIALES: Nivel[] = [{ campo: "dinero", desc: true }, { campo: "", desc: false }, { campo: "", desc: false }];
/** Nombre del sentido según el tipo de campo (A → Z en textos, menor a mayor en números). */
const sentidos = (campo: Campo | "") => (CAMPOS.find((c) => c.id === campo)?.tipo === "numero"
    ? ["De menor a mayor", "De mayor a menor"] : ["De la A a la Z", "De la Z a la A"]);
type Numero = "toyota" | "nuestro";
/** Qué se muestra en el listado (se elige en el panel). */
interface Mostrar { numero: Numero; marca: boolean; disponible: boolean; tachado: boolean; totalLinea: boolean; totalLote: boolean }
interface Opciones extends Mostrar { precio: Precio; contacto: string; subtitulo: string; nota: string; descPieza: number; descLote: number; datosAl: string }
const MOSTRAR_INICIAL: Mostrar = { numero: "toyota", marca: true, disponible: true, tachado: true, totalLinea: false, totalLote: true };

// Hoja A4 en puntos; se dibuja a 2,5 px por punto (unos 180 dpi) para que el texto salga nítido
const HOJA_ANCHO = 595;
const HOJA_ALTO = 842;
const ESCALA = 2.5;
const PX_ANCHO = Math.round(HOJA_ANCHO * ESCALA);
const PX_ALTO = Math.round(HOJA_ALTO * ESCALA);
const MARGEN = 36;
const DER = HOJA_ANCHO - MARGEN;
const TABLA_1 = 140; // donde empiezan las filas en la primera hoja (tiene el encabezado grande)
const TABLA_N = 84; // y en las demás
const FIN_TABLA = HOJA_ALTO - 62;
const ANCHO_PRECIO = 66;
const FUENTE_NOMBRE = "bold 9px Arial, sans-serif";

const CARMESI = "#a32240";
const OSCURO = "#2b2b2b";
const GRIS = "#6b6b6b";
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

/** Fila de la tabla: un repuesto (con su nombre ya cortado en líneas y su alto), el título de un grupo
 *  (familia o marca) o la línea de total al final. */
type Fila = { item: ItemListado; nombre: string[]; alto: number } | { grupo: string; sigue?: boolean } | { total: number; cantidad: number };
const ALTO_TOTAL = 28;
const ALTO_GRUPO = 20;
const altoFila = (f: Fila) => ("item" in f ? f.alto : "grupo" in f ? ALTO_GRUPO : ALTO_TOTAL);
/** Alto de una fila según sus líneas de texto (nombre + marca): 22 pt con una, 28 con dos, 38 con tres. */
const altoPorLineas = (n: number) => Math.max(22, 8 + 10 * n);

/** Dónde va cada columna: número, repuesto, disponible y los precios (anchos fijos desde la derecha). */
function disposicion(o: Opciones) {
    const cols = columnasPrecio(o);
    const xPrecios = cols.map((_, i) => DER - (cols.length - 1 - i) * ANCHO_PRECIO); // borde derecho de cada una
    const finPrecios = DER - cols.length * ANCHO_PRECIO; // borde izquierdo de los precios
    const xDisp = finPrecios - 6;
    const xNombre = MARGEN + 80;
    return { cols, xPrecios, xDisp, xNombre, anchoNombre: (o.disponible ? xDisp - 34 : finPrecios - 10) - xNombre };
}

const numeroDe = (it: ItemListado, o: Mostrar) => (o.numero === "toyota" ? numeroPublico(it.codigo) : it.codigo);
const marcaDe = (it: ItemListado) => (it.marca ? `${it.marca}${it.origen ? ` · ${it.origen}` : ""}` : "");

/** Reparte las filas en hojas según su alto (la primera hoja tiene menos espacio por el encabezado).
 *  Un título de grupo no queda solo al pie de una hoja, y si un grupo sigue en la hoja siguiente se
 *  repite su título con "(continúa)". */
function paginar(filas: Fila[]): Fila[][] {
    const hojas: Fila[][] = [[]];
    let y = TABLA_1;
    let grupo: string | null = null;
    filas.forEach((f, i) => {
        const siguiente = filas[i + 1];
        const alto = altoFila(f) + ("grupo" in f && siguiente ? altoFila(siguiente) : 0);
        if (y + alto > FIN_TABLA && hojas[hojas.length - 1].length > 0) {
            hojas.push([]);
            y = TABLA_N;
            if ("item" in f && grupo) {
                hojas[hojas.length - 1].push({ grupo, sigue: true });
                y += ALTO_GRUPO;
            }
        }
        if ("grupo" in f) grupo = f.grupo;
        hojas[hojas.length - 1].push(f);
        y += altoFila(f);
    });
    return hojas;
}

/** Valor de un repuesto para un campo de orden. "dinero" es su posición en la tabla (que ya viene
 *  del que más dinero tiene parado al que menos), así que se invierte para que mayor = más dinero. */
function valorDe(it: ItemListado, campo: Campo, posicion: number, o: Mostrar): string | number | null {
    switch (campo) {
        case "dinero": return -posicion;
        case "numero": return numeroDe(it, o);
        case "nombre": return it.nombre;
        case "familia": return it.familia?.trim() || null;
        case "marca": return it.marca?.trim() || null;
        case "origen": return it.origen?.trim() || null;
        case "precio": return it.contado; // precio de liquidación (el de lote va en la misma proporción)
        case "disponible": return it.disponible;
    }
}
const SIN: Record<string, string> = { familia: "Sin familia", marca: "Sin marca", origen: "Sin origen" };

/** Ordena por los niveles elegidos; si se pide, devuelve el título de grupo (el valor del primer nivel). */
function ordenar(items: ItemListado[], niveles: Nivel[], agrupar: boolean, o: Mostrar): { item: ItemListado; grupo?: string }[] {
    const activos = niveles.filter((n): n is Nivel & { campo: Campo } => n.campo !== "");
    const filas = items.map((item, posicion) => ({ item, posicion }));
    filas.sort((a, b) => {
        for (const n of activos) {
            const va = valorDe(a.item, n.campo, a.posicion, o);
            const vb = valorDe(b.item, n.campo, b.posicion, o);
            if (va === vb) continue;
            // Los vacíos ("Sin familia"…) siempre al final, sin importar el sentido
            if (va == null) return 1;
            if (vb == null) return -1;
            const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es", { numeric: true });
            if (c !== 0) return n.desc ? -c : c;
        }
        return a.posicion - b.posicion;
    });
    const primero = activos[0]?.campo;
    const conGrupo = agrupar && primero && AGRUPABLES.includes(primero);
    return filas.map(({ item, posicion }) => ({
        item,
        grupo: conGrupo ? String(valorDe(item, primero, posicion, o) ?? SIN[primero]) : undefined,
    }));
}

/** Columnas de precio según lo elegido: título y cómo sacar el valor. */
type Columna = { titulo: string; valor: (it: ItemListado) => number | null; tipo: "normal" | "precio" | "total" };
function columnasPrecio(o: Opciones): Columna[] {
    const cols: Columna[] = [];
    if (o.tachado) cols.push({ titulo: "Precio normal", valor: (it) => it.precioNormal, tipo: "normal" });
    if (o.precio !== "lote") cols.push({ titulo: `Contado -${o.descPieza} %`, valor: (it) => it.contado, tipo: "precio" });
    if (o.precio !== "contado") cols.push({ titulo: `Lote -${o.descLote} %`, valor: (it) => it.lote, tipo: "precio" });
    // Total del renglón (disponible × precio; con lote si se muestra, si no de contado)
    if (o.totalLinea) cols.push({ titulo: "Total", valor: (it) => it.disponible * (o.precio === "contado" ? it.contado : it.lote), tipo: "total" });
    return cols;
}

function dibujarHoja(ctx: CanvasRenderingContext2D, filas: Fila[], hoja: number, hojas: number, o: Opciones, logo: HTMLImageElement | null) {
    ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, HOJA_ANCHO, HOJA_ALTO);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Encabezado: grande en la primera hoja, chico en las demás
    const primera = hoja === 1;
    const anchoLogo = primera ? 160 : 96;
    if (logo) ctx.drawImage(logo, MARGEN, primera ? 34 : 26, anchoLogo, (anchoLogo * logo.height) / logo.width);
    else {
        ctx.fillStyle = OSCURO;
        ctx.font = `bold ${primera ? 22 : 14}px Arial, sans-serif`;
        ctx.fillText("ToyoXpress", MARGEN, primera ? 60 : 42);
    }
    ctx.textAlign = "right";
    if (primera) {
        ctx.fillStyle = CARMESI;
        ctx.font = "bold 26px Arial, sans-serif";
        ctx.fillText("LIQUIDACIÓN", DER, 60);
        ctx.fillStyle = OSCURO;
        ctx.font = "10px Arial, sans-serif";
        ctx.fillText(o.subtitulo, DER, 78);
        ctx.fillStyle = GRIS;
        ctx.font = "8.5px Arial, sans-serif";
        ctx.fillText(`Precios en USD · hasta agotar existencia · ${fechaCorta(o.datosAl)}`, DER, 92);
    } else {
        ctx.fillStyle = GRIS;
        ctx.font = "9px Arial, sans-serif";
        ctx.fillText(`Liquidación · ${fechaCorta(o.datosAl)}`, DER, 42);
    }

    const { cols, xPrecios, xDisp, xNombre, anchoNombre } = disposicion(o);

    const yCab = (primera ? TABLA_1 : TABLA_N) - 22;
    ctx.fillStyle = CARMESI;
    ctx.fillRect(MARGEN - 4, yCab, DER - MARGEN + 8, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8.5px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Nº", MARGEN, yCab + 13.5);
    ctx.fillText("Repuesto", xNombre, yCab + 13.5);
    ctx.textAlign = "right";
    if (o.disponible) ctx.fillText("Disp.", xDisp, yCab + 13.5);
    cols.forEach((c, i) => ctx.fillText(c.titulo, xPrecios[i], yCab + 13.5));

    // Filas
    let y = primera ? TABLA_1 : TABLA_N;
    let par = 0; // para alternar el fondo de las filas; vuelve a empezar en cada grupo
    filas.forEach((f) => {
        if ("grupo" in f) {
            ctx.fillStyle = "#f6e9ec";
            ctx.fillRect(MARGEN - 4, y + 3, DER - MARGEN + 8, ALTO_GRUPO - 4);
            ctx.textAlign = "left";
            ctx.fillStyle = CARMESI;
            ctx.font = "bold 9px Arial, sans-serif";
            ctx.fillText(`${f.grupo.toUpperCase()}${f.sigue ? " (continúa)" : ""}`, MARGEN, y + 15.5);
            y += ALTO_GRUPO;
            par = 0;
            return;
        }
        if ("total" in f) {
            ctx.strokeStyle = OSCURO;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(MARGEN - 4, y + 2); ctx.lineTo(DER + 4, y + 2); ctx.stroke();
            ctx.textAlign = "right";
            ctx.fillStyle = OSCURO;
            ctx.font = "bold 10px Arial, sans-serif";
            ctx.fillText(`Total llevando los ${num(f.cantidad)} repuestos del lote`, DER - ANCHO_PRECIO - 10, y + 19);
            ctx.fillStyle = CARMESI;
            ctx.font = "bold 12px Arial, sans-serif";
            ctx.fillText(usd.format(f.total), DER, y + 19);
            return;
        }
        const it = f.item;
        const alto = altoFila(f);
        const medio = y + alto / 2 + 3.5; // línea base para centrar un texto de 9 pt en la fila
        if (par++ % 2 === 1) {
            ctx.fillStyle = "#f5f5f5";
            ctx.fillRect(MARGEN - 4, y, DER - MARGEN + 8, alto);
        }
        ctx.textAlign = "left";
        ctx.fillStyle = OSCURO;
        ctx.font = FUENTE_NOMBRE;
        ctx.fillText(numeroDe(it, o), MARGEN, medio);
        const marca = o.marca ? marcaDe(it) : "";
        const nLineas = f.nombre.length + (marca ? 1 : 0);
        let yy = y + (alto - 10 * nLineas) / 2 + 8;
        for (const l of f.nombre) { ctx.fillText(l, xNombre, yy); yy += 10; }
        if (marca) {
            ctx.fillStyle = GRIS;
            ctx.font = "8px Arial, sans-serif";
            ctx.fillText(lineas(ctx, marca, anchoNombre, 1)[0] ?? "", xNombre, yy + 0.5);
        }

        ctx.textAlign = "right";
        ctx.fillStyle = OSCURO;
        ctx.font = "9px Arial, sans-serif";
        if (o.disponible) ctx.fillText(num(it.disponible), xDisp, medio);
        cols.forEach((c, k) => {
            const v = c.valor(it);
            if (v == null) return;
            const texto = usd.format(v);
            if (c.tipo === "normal") {
                ctx.fillStyle = GRIS;
                ctx.font = "9px Arial, sans-serif";
                ctx.fillText(texto, xPrecios[k], medio);
                const w = ctx.measureText(texto).width;
                ctx.strokeStyle = GRIS;
                ctx.lineWidth = 0.7;
                ctx.beginPath(); ctx.moveTo(xPrecios[k] - w, medio - 3); ctx.lineTo(xPrecios[k], medio - 3); ctx.stroke();
            } else if (c.tipo === "total") {
                ctx.fillStyle = OSCURO;
                ctx.font = "bold 9px Arial, sans-serif";
                ctx.fillText(texto, xPrecios[k], medio);
            } else {
                ctx.fillStyle = CARMESI;
                ctx.font = "bold 10px Arial, sans-serif";
                ctx.fillText(texto, xPrecios[k], medio);
            }
        });
        y += alto;
    });

    // Pie: contacto, nota y número de hoja
    ctx.strokeStyle = CARMESI;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MARGEN - 4, HOJA_ALTO - 52); ctx.lineTo(DER + 4, HOJA_ALTO - 52); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = OSCURO;
    ctx.font = "bold 10px Arial, sans-serif";
    ctx.fillText(lineas(ctx, o.contacto, DER - MARGEN - 80, 1)[0] ?? "", MARGEN, HOJA_ALTO - 36);
    ctx.fillStyle = GRIS;
    ctx.font = "8px Arial, sans-serif";
    ctx.fillText(lineas(ctx, o.nota, DER - MARGEN - 80, 1)[0] ?? "", MARGEN, HOJA_ALTO - 23);
    ctx.textAlign = "right";
    ctx.fillText(`Página ${hoja} de ${hojas}`, DER, HOJA_ALTO - 36);
}

function lienzo(): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
    const c = document.createElement("canvas");
    c.width = PX_ANCHO;
    c.height = PX_ALTO;
    return [c, c.getContext("2d")];
}

export function ListadoLiquidacionPdf({ items, descPieza, descLote, datosAl }: {
    items: ItemListado[]; descPieza: number; descLote: number; datosAl: string;
}) {
    const [cuantos, setCuantos] = useState(0);
    const [precio, setPrecio] = useState<Precio>("ambos");
    const [niveles, setNiveles] = useState<Nivel[]>(NIVELES_INICIALES);
    const [agrupar, setAgrupar] = useState(true);
    const cambiarNivel = (i: number, cambio: Partial<Nivel>) => setNiveles((ns) => ns.map((n, k) => {
        if (k !== i) return n;
        const nuevo = { ...n, ...cambio };
        // Al elegir un campo nuevo, el sentido natural: números de mayor a menor, textos de la A a la Z
        if (cambio.campo !== undefined && cambio.campo !== n.campo) nuevo.desc = CAMPOS.find((c) => c.id === cambio.campo)?.tipo === "numero";
        return nuevo;
    }));
    const agrupable = !!niveles[0].campo && AGRUPABLES.includes(niveles[0].campo);
    const [mostrar, setMostrar] = useState<Mostrar>(MOSTRAR_INICIAL);
    const cambiar = <K extends keyof Mostrar>(k: K, v: Mostrar[K]) => setMostrar((m) => ({ ...m, [k]: v }));
    const [contacto, setContacto] = useState("Pedidos por WhatsApp · pregunta por el lote completo");
    const [vista, setVista] = useState<{ clave: string; url: string } | null>(null);
    const [armando, setArmando] = useState(false);

    // "Los N primeros" son los N de más dinero parado (el orden de la tabla); después se ordenan
    const ordenados = useMemo(() => ordenar(cuantos > 0 ? items.slice(0, cuantos) : items, niveles, agrupar, mostrar), [items, cuantos, niveles, agrupar, mostrar]);
    const elegidos = ordenados.map((o) => o.item);

    const opciones: Opciones = {
        ...mostrar, precio, contacto, descPieza, descLote, datosAl,
        subtitulo: precio === "contado" ? `Repuestos con ${descPieza} % de descuento · pago de contado`
            : precio === "lote" ? `Precios llevando el lote completo · ${descLote} % de descuento`
                : `Contado por pieza (-${descPieza} %) o llevando el lote completo (-${descLote} %)`,
        nota: "Precios en USD · hasta agotar existencia · sujeto a disponibilidad al momento del pedido",
    };
    // El nombre se corta en hasta dos líneas midiendo con la misma fuente con que se dibuja
    const medidor = useMemo(() => (typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")), []);
    const { anchoNombre } = disposicion(opciones);
    const filas: Fila[] = [];
    ordenados.forEach(({ item, grupo }, i) => {
        if (grupo && grupo !== ordenados[i - 1]?.grupo) filas.push({ grupo });
        let nombre = [item.nombre];
        if (medidor) {
            medidor.font = FUENTE_NOMBRE;
            nombre = lineas(medidor, item.nombre, anchoNombre, 2);
        }
        filas.push({ item, nombre, alto: altoPorLineas(nombre.length + (mostrar.marca && marcaDe(item) ? 1 : 0)) });
    });
    const conTotalLote = mostrar.totalLote && precio !== "contado";
    if (conTotalLote && elegidos.length > 0) {
        filas.push({ total: elegidos.reduce((s, it) => s + it.disponible * it.lote, 0), cantidad: elegidos.length });
    }
    const hojas = paginar(filas);
    const clave = JSON.stringify([elegidos.map((i) => `${i.codigo}:${i.contado}:${i.lote}`), niveles, agrupar, opciones]);

    // Vista previa de la primera hoja
    useEffect(() => {
        let vigente = true;
        (async () => {
            const logo = await cargarImagen("/toyoxpress-logo.png");
            const [c, ctx] = lienzo();
            if (!ctx) return;
            dibujarHoja(ctx, hojas[0], 1, hojas.length, opciones, logo);
            if (vigente) setVista({ clave, url: c.toDataURL("image/jpeg", 0.85) });
        })();
        return () => { vigente = false; };
        // clave resume todo lo que cambia el dibujo
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]);

    const descargar = async () => {
        setArmando(true);
        try {
            const logo = await cargarImagen("/toyoxpress-logo.png");
            const jpegs: Uint8Array[] = [];
            hojas.forEach((h, i) => {
                const [c, ctx] = lienzo();
                if (!ctx) return;
                dibujarHoja(ctx, h, i + 1, hojas.length, opciones, logo);
                jpegs.push(bytesDeDataUrl(c.toDataURL("image/jpeg", 0.82)));
            });
            const url = URL.createObjectURL(pdfDeImagenes(jpegs, PX_ANCHO, PX_ALTO, HOJA_ANCHO, HOJA_ALTO));
            const a = document.createElement("a");
            a.href = url;
            a.download = `Liquidacion_ToyoXpress_${datosAl}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } finally {
            setArmando(false);
        }
    };

    const control = "rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground";
    const lista = vista?.clave === clave ? vista.url : null;
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Repuestos
                    <select value={cuantos} onChange={(e) => setCuantos(Number(e.target.value))} className={control}>
                        <option value={0}>Todos ({num(items.length)})</option>
                        {[24, 48, 100].filter((n) => n < items.length).map((n) => <option key={n} value={n}>Los {n} primeros</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Precio
                    <select value={precio} onChange={(e) => setPrecio(e.target.value as Precio)} className={control}>
                        <option value="ambos">Contado y lote</option>
                        <option value="contado">Solo contado (-{descPieza} %)</option>
                        <option value="lote">Solo lote (-{descLote} %)</option>
                    </select>
                </label>
                <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs text-muted-foreground">
                    Texto de contacto
                    <input value={contacto} onChange={(e) => setContacto(e.target.value)} maxLength={90} className={control} />
                </label>
                <button type="button" onClick={descargar} disabled={armando || elegidos.length === 0} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                    {armando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Descargar PDF
                </button>
            </div>
            <fieldset className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                <legend className="px-1 font-medium text-foreground">Ordenar</legend>
                {niveles.map((n, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        {i === 0 ? "Ordenar por" : "Luego por"}
                        <div className="flex gap-1">
                            <select aria-label={`${i === 0 ? "Ordenar por" : "Luego por"} (nivel ${i + 1})`} value={n.campo} onChange={(e) => cambiarNivel(i, { campo: e.target.value as Campo | "" })} className={control}>
                                <option value="">{i === 0 ? "Como la tabla" : "—"}</option>
                                {CAMPOS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            {n.campo && (
                                <select aria-label={`Sentido del nivel ${i + 1}`} value={n.desc ? "desc" : "asc"} onChange={(e) => cambiarNivel(i, { desc: e.target.value === "desc" })} className={control}>
                                    {sentidos(n.campo).map((s, k) => <option key={s} value={k ? "desc" : "asc"}>{s}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                ))}
                {agrupable && (
                    <label className="flex items-center gap-2 pb-2">
                        <input type="checkbox" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} />
                        Título por cada {CAMPOS.find((c) => c.id === niveles[0].campo)?.nombre.toLowerCase()}
                    </label>
                )}
                <button type="button" onClick={() => setNiveles(NIVELES_INICIALES)} className="pb-2 text-xs underline hover:text-foreground">Volver al orden de la tabla</button>
            </fieldset>
            <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                <legend className="px-1 font-medium text-foreground">Mostrar</legend>
                <label className="flex items-center gap-2">
                    Número
                    <select value={mostrar.numero} onChange={(e) => cambiar("numero", e.target.value as Numero)} className={control}>
                        <option value="toyota">Toyota (sin G ni -J/-T)</option>
                        <option value="nuestro">Código ToyoXpress</option>
                    </select>
                </label>
                {([
                    ["marca", "Marca y origen"],
                    ["disponible", "Cantidad disponible"],
                    ["tachado", "Precio normal tachado"],
                    ["totalLinea", "Total por repuesto (disp. × precio)"],
                ] as const).map(([k, texto]) => (
                    <label key={k} className="flex items-center gap-2">
                        <input type="checkbox" checked={mostrar[k]} onChange={(e) => cambiar(k, e.target.checked)} />
                        {texto}
                    </label>
                ))}
                <label className={precio === "contado" ? "flex items-center gap-2 text-muted-foreground" : "flex items-center gap-2"} title={precio === "contado" ? "Solo con precio de lote" : undefined}>
                    <input type="checkbox" checked={mostrar.totalLote} disabled={precio === "contado"} onChange={(e) => cambiar("totalLote", e.target.checked)} />
                    Total del lote al final
                </label>
            </fieldset>
            <p className="text-xs text-muted-foreground">
                {num(elegidos.length)} repuestos en {num(hojas.length)} {hojas.length === 1 ? "hoja" : "hojas"} A4. Solo van los que están marcados en la tabla, nunca costos ni datos internos.
            </p>
            {!lista ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Armando la vista previa…</p>
            ) : (
                <figure className="max-w-md space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lista} alt="Primera hoja del listado de liquidación" className="w-full rounded-md border border-border shadow-sm" />
                    <figcaption className="text-xs text-muted-foreground">Primera hoja{hojas.length > 1 ? ` de ${num(hojas.length)}` : ""}</figcaption>
                </figure>
            )}
        </div>
    );
}
