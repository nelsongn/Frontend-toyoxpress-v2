"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { num } from "./formato";

/**
 * Imágenes para redes sociales con la lista de liquidación (formato Instagram 1080×1350).
 * Se dibujan en el navegador con canvas: logo, título, repuestos con precio normal tachado y precio
 * de liquidación, y un pie con el texto de contacto. Si son muchos repuestos salen varias (carrusel).
 */

export interface ItemImagen { codigo: string; nombre: string; marca: string | null; precioNormal: number | null; precio: number; disponible: number }

const ANCHO = 1080;
const ALTO = 1350;
const CARMESI = "#a32240";
const OSCURO = "#2b2b2b";
const GRIS = "#6b6b6b";
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Número que el cliente reconoce: sin la G ni el sufijo de origen (-J, -T) de nuestros códigos. */
export const numeroPublico = (codigo: string) => codigo.replace(/^G(?=\d)/, "").replace(/-(J|T)$/, "");

export function cargarImagen(src: string): Promise<HTMLImageElement | null> {
    return new Promise((ok) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => ok(null);
        img.src = src;
    });
}

/** Rectángulo con esquinas redondeadas (roundRect no existe en Chrome 109 de la bodega). */
function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Corta un texto en líneas que caben en el ancho; la última con "…" si no cabe todo. */
export function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, max: number): string[] {
    const palabras = texto.split(/\s+/);
    const r: string[] = [];
    let actual = "";
    for (const p of palabras) {
        const prueba = actual ? `${actual} ${p}` : p;
        if (ctx.measureText(prueba).width <= ancho) { actual = prueba; continue; }
        if (actual) r.push(actual);
        actual = p;
        if (r.length === max) break;
    }
    if (r.length < max && actual) r.push(actual);
    if (r.length === max && r.join(" ").length < texto.length) {
        let ultima = r[max - 1];
        while (ultima && ctx.measureText(`${ultima}…`).width > ancho) ultima = ultima.slice(0, -1);
        r[max - 1] = `${ultima.trimEnd()}…`;
    }
    return r.slice(0, max);
}

function dibujar(
    ctx: CanvasRenderingContext2D, items: ItemImagen[], pagina: number, paginas: number,
    opciones: { titulo: string; subtitulo: string; contacto: string; nota: string; tachado: boolean },
    logo: HTMLImageElement | null, fondo: HTMLImageElement | null,
) {
    ctx.textBaseline = "alphabetic";
    // Con fondo de marca: texto claro arriba y la lista en una tarjeta blanca; sin fondo, todo sobre blanco
    const conFondo = !!fondo;
    if (fondo) ctx.drawImage(fondo, 0, 0, ANCHO, ALTO);
    else { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, ANCHO, ALTO); }

    // Encabezado: logo (sobre una placa blanca si hay fondo), título y subtítulo
    if (logo) {
        const w = 440;
        const h = (w * logo.height) / logo.width;
        if (conFondo) {
            ctx.fillStyle = "#ffffff";
            redondeado(ctx, 40, 36, w + 44, h + 36, 18);
            ctx.fill();
            ctx.drawImage(logo, 62, 54, w, h);
        } else {
            ctx.drawImage(logo, 60, 56, w, h);
        }
    } else {
        ctx.fillStyle = conFondo ? "#ffffff" : OSCURO;
        ctx.font = "bold 64px Arial, sans-serif";
        ctx.fillText("ToyoXpress", 60, 120);
    }
    if (paginas > 1) {
        ctx.fillStyle = conFondo ? "#ffffff" : GRIS;
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${pagina}/${paginas}`, ANCHO - 60, 110);
        ctx.textAlign = "left";
    }
    if (conFondo) { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = conFondo ? "#ffffff" : CARMESI;
    ctx.font = "bold 104px Arial, sans-serif";
    ctx.fillText(opciones.titulo, 56, 268);
    ctx.fillStyle = conFondo ? "#f1f1f1" : OSCURO;
    ctx.font = "34px Arial, sans-serif";
    ctx.fillText(opciones.subtitulo, 60, 322);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Lista de repuestos (en una tarjeta blanca si hay fondo)
    const arriba = conFondo ? 372 : 360;
    const abajo = conFondo ? 1172 : 1190;
    const izq = conFondo ? 72 : 60;
    const der = ANCHO - izq;
    if (conFondo) {
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        redondeado(ctx, 40, 350, ANCHO - 80, 840, 26);
        ctx.fill();
    }
    const alto = (abajo - arriba) / Math.max(items.length, 1);
    const anchoTexto = 620;
    items.forEach((it, i) => {
        const y = arriba + i * alto;
        if (i > 0 || !conFondo) {
            ctx.strokeStyle = "#e5e5e5";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(izq, y); ctx.lineTo(der, y); ctx.stroke();
        }

        const centro = y + alto / 2;
        ctx.fillStyle = OSCURO;
        ctx.font = "bold 27px Arial, sans-serif";
        const ls = lineas(ctx, it.nombre, anchoTexto, alto >= 96 ? 2 : 1);
        const bloque = ls.length * 31 + 30;
        let yy = centro - bloque / 2 + 25;
        for (const l of ls) { ctx.fillText(l, izq, yy); yy += 31; }
        ctx.fillStyle = GRIS;
        ctx.font = "24px Arial, sans-serif";
        ctx.fillText([`Nº ${numeroPublico(it.codigo)}`, it.marca, `${num(it.disponible)} disp.`].filter(Boolean).join("  ·  "), izq, yy + 2);

        // Precios a la derecha
        ctx.textAlign = "right";
        if (opciones.tachado && it.precioNormal && it.precioNormal > it.precio) {
            ctx.fillStyle = GRIS;
            ctx.font = "26px Arial, sans-serif";
            const antes = usd.format(it.precioNormal);
            const wAntes = ctx.measureText(antes).width;
            ctx.fillText(antes, der, centro - 14);
            ctx.strokeStyle = GRIS;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(der - wAntes, centro - 23); ctx.lineTo(der, centro - 23); ctx.stroke();
            ctx.fillStyle = CARMESI;
            ctx.font = "bold 46px Arial, sans-serif";
            ctx.fillText(usd.format(it.precio), der, centro + 34);
        } else {
            ctx.fillStyle = CARMESI;
            ctx.font = "bold 46px Arial, sans-serif";
            ctx.fillText(usd.format(it.precio), der, centro + 16);
        }
        ctx.textAlign = "left";
    });

    // Pie con el contacto
    ctx.fillStyle = CARMESI;
    ctx.fillRect(0, 1210, ANCHO, ALTO - 1210);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial, sans-serif";
    ctx.fillText(lineas(ctx, opciones.contacto, ANCHO - 120, 1)[0] ?? "", 60, 1270);
    ctx.font = "26px Arial, sans-serif";
    ctx.fillText(lineas(ctx, opciones.nota, ANCHO - 120, 1)[0] ?? "", 60, 1316);
}

export function ImagenLiquidacion({ items, descuento, tipoPrecio, datosAl }: {
    items: ItemImagen[]; descuento: number; tipoPrecio: "contado" | "lote"; datosAl: string;
}) {
    const [porImagen, setPorImagen] = useState(8);
    const [cuantos, setCuantos] = useState(24);
    const [tachado, setTachado] = useState(true);
    // Fondo de marca (generado con IA: ladrillo oscuro, luz carmesí y repuestos) o blanco liso
    const [conFondo, setConFondo] = useState(true);
    const [contacto, setContacto] = useState("Pedidos por WhatsApp · pregunta por el lote completo");
    const [imagenes, setImagenes] = useState<{ clave: string; urls: string[] } | null>(null);

    const elegidos = cuantos > 0 ? items.slice(0, cuantos) : items;
    const subtitulo = tipoPrecio === "contado" ? `Repuestos con ${descuento} % de descuento · pago de contado` : `Precios llevando el lote completo · ${descuento} % de descuento`;
    const clave = JSON.stringify([elegidos.map((i) => `${i.codigo}:${i.precio}`), porImagen, tachado, contacto, subtitulo, conFondo]);

    useEffect(() => {
        let vigente = true;
        (async () => {
            const [logo, fondo] = await Promise.all([
                cargarImagen("/toyoxpress-logo.png"),
                conFondo ? cargarImagen("/redes/fondo-liquidacion.jpg") : Promise.resolve(null),
            ]);
            const urls: string[] = [];
            const paginas = Math.max(1, Math.ceil(elegidos.length / porImagen));
            for (let p = 0; p < paginas; p++) {
                const canvas = document.createElement("canvas");
                canvas.width = ANCHO;
                canvas.height = ALTO;
                const ctx = canvas.getContext("2d");
                if (!ctx) continue;
                dibujar(ctx, elegidos.slice(p * porImagen, (p + 1) * porImagen), p + 1, paginas, {
                    titulo: "LIQUIDACIÓN", subtitulo, contacto,
                    nota: `Precios en USD · hasta agotar existencia · ${datosAl.split("-").reverse().join("/")}`, tachado,
                }, logo, fondo);
                urls.push(canvas.toDataURL("image/png"));
            }
            if (vigente) setImagenes({ clave, urls });
        })();
        return () => { vigente = false; };
        // clave resume todo lo que cambia el dibujo
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]);

    const listas = imagenes?.clave === clave ? imagenes.urls : null;
    const descargar = (url: string, i: number) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Liquidacion_ToyoXpress_${i + 1}.png`;
        a.click();
    };

    const control = "rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground";
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Repuestos
                    <select value={cuantos} onChange={(e) => setCuantos(Number(e.target.value))} className={control}>
                        {[8, 16, 24, 48].map((n) => <option key={n} value={n}>Los {n} primeros</option>)}
                        <option value={0}>Todos ({num(items.length)})</option>
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Por imagen
                    <select value={porImagen} onChange={(e) => setPorImagen(Number(e.target.value))} className={control}>
                        {[5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
                <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs text-muted-foreground">
                    Texto de contacto
                    <input value={contacto} onChange={(e) => setContacto(e.target.value)} maxLength={70} className={control} />
                </label>
                <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={tachado} onChange={(e) => setTachado(e.target.checked)} />
                    Precio normal tachado
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Fondo
                    <select value={conFondo ? "marca" : "blanco"} onChange={(e) => setConFondo(e.target.value === "marca")} className={control}>
                        <option value="marca">De marca (ladrillo y repuestos)</option>
                        <option value="blanco">Blanco</option>
                    </select>
                </label>
                {listas && (
                    <button type="button" onClick={() => listas.forEach((u, i) => descargar(u, i))} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                        <Download className="h-3.5 w-3.5" /> Descargar {listas.length > 1 ? `las ${num(listas.length)}` : "la imagen"}
                    </button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">Usa los repuestos del lote en el orden de la tabla y el precio {tipoPrecio === "contado" ? "de contado" : "de lote"}. El número que se muestra es el Toyota (sin la G ni el -J/-T de nuestros códigos).</p>
            {!listas ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Armando las imágenes…</p>
            ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {listas.map((u, i) => (
                        <figure key={i} className="space-y-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt={`Imagen de liquidación ${i + 1}`} className="w-full rounded-md border border-border" />
                            <button type="button" onClick={() => descargar(u, i)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <Download className="h-3 w-3" /> Descargar {i + 1}
                            </button>
                        </figure>
                    ))}
                </div>
            )}
        </div>
    );
}
