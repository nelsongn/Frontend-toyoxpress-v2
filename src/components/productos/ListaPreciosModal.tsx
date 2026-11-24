"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileSpreadsheet, FileText, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ListaPreciosDocument } from "./ListaPreciosDocument";
import { excelListaPrecios, fechaCorta, type ArticuloLista, type EstiloResaltado, type OpcionesLista, type PrecioLista } from "./listaPreciosExcel";

// Lista de precios para descargar en Excel o PDF (botón "Lista de precios" del menú, debajo de Productos).
// Los datos y las reglas (descuento, piezas nuevas, bujías, código 150) vienen del backend: GET /productos/lista-precios.

interface Respuesta {
    datosAl: string;
    reglas: { descuento: number; mesesNuevo: number; minBujias: number };
    articulos: ArticuloLista[];
}

// Últimas opciones elegidas, guardadas por equipo
const CLAVE_ESTILO = "toyoxpress-lista-precios-estilo";
const CLAVE_PRECIO = "toyoxpress-lista-precios-precio";

function leer(clave: string): string | null {
    try {
        return localStorage.getItem(clave);
    } catch {
        return null;
    }
}

function guardar(clave: string, valor: string) {
    try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ }
}

const PRECIOS: { valor: PrecioLista; texto: string }[] = [
    { valor: "minimo", texto: "Precio mínimo" },
    { valor: "oferta", texto: "Precio oferta" },
];

function descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ListaPreciosModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [datos, setDatos] = useState<Respuesta | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [estilo, setEstilo] = useState<EstiloResaltado>("texto");
    const [precio, setPrecio] = useState<PrecioLista>("minimo");
    const [armando, setArmando] = useState<"excel" | "pdf" | null>(null);

    // Datos frescos cada vez que se abre
    useEffect(() => {
        if (!open) return;
        let vigente = true;
        setEstilo(leer(CLAVE_ESTILO) === "fondo" ? "fondo" : "texto");
        setPrecio(leer(CLAVE_PRECIO) === "oferta" ? "oferta" : "minimo");
        setDatos(null);
        setError(null);
        api.get("/productos/lista-precios")
            .then((r) => { if (vigente) setDatos(r.data); })
            .catch((e) => {
                if (!vigente) return;
                setError(e?.response?.status === 403 ? "No tienes permiso para ver los precios." : "No se pudo cargar la lista. Intenta de nuevo.");
            });
        return () => { vigente = false; };
    }, [open]);

    const elegirEstilo = (e: EstiloResaltado) => { setEstilo(e); guardar(CLAVE_ESTILO, e); };
    const elegirPrecio = (p: PrecioLista) => { setPrecio(p); guardar(CLAVE_PRECIO, p); };

    const opciones: OpcionesLista | null = datos
        ? { estilo, precio, datosAl: datos.datosAl }
        : null;
    const nombre = datos ? `Lista_de_precios_ToyoXpress_${datos.datosAl}` : "";
    const cuantos = (e: ArticuloLista["estado"]) => datos?.articulos.filter((a) => a.estado === e).length ?? 0;

    const bajarExcel = () => {
        if (!datos || !opciones) return;
        setArmando("excel");
        setError(null);
        try {
            descargar(excelListaPrecios(datos.articulos, opciones), `${nombre}.xlsx`);
        } catch {
            setError("No se pudo generar el Excel. Intenta de nuevo.");
        } finally {
            setArmando(null);
        }
    };

    const bajarPdf = async () => {
        if (!datos || !opciones) return;
        setArmando("pdf");
        setError(null);
        try {
            const blob = await pdf(<ListaPreciosDocument articulos={datos.articulos} opciones={opciones} />).toBlob();
            descargar(blob, `${nombre}.pdf`);
        } catch {
            setError("No se pudo generar el PDF. Intenta de nuevo.");
        } finally {
            setArmando(null);
        }
    };

    const opcion = (activa: boolean, elegir: () => void, texto: string) => (
        <button
            type="button"
            onClick={elegir}
            aria-pressed={activa}
            className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                activa ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
        >
            {texto}
        </button>
    );

    const boton = "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Lista de precios</DialogTitle>
                    <DialogDescription>
                        {datos
                            ? `${datos.articulos.length} repuestos · datos de Valery al ${fechaCorta(datos.datosAl)}`
                            : error ? "" : "Cargando datos de Valery…"}
                    </DialogDescription>
                </DialogHeader>

                {!datos && !error && (
                    <div className="flex h-24 items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    </div>
                )}

                {datos && (
                    <div className="space-y-4">
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">¿Qué precio va en el listado?</p>
                            <div className="flex gap-2">
                                {PRECIOS.map((p) => (
                                    <span key={p.valor} className="contents">{opcion(precio === p.valor, () => elegirPrecio(p.valor), p.texto)}</span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Resaltar con</p>
                            <div className="flex gap-2">
                                {opcion(estilo === "texto", () => elegirEstilo("texto"), "Texto en color")}
                                {opcion(estilo === "fondo", () => elegirEstilo("fondo"), "Fondo de celda")}
                            </div>
                        </div>

                        <ul className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                            <li>
                                Solo con existencia; bujías desde {datos.reglas.minBujias} unidades; sin el código 150 (delivery).
                            </li>
                            <li>
                                <span className={cn("font-bold text-red-600 dark:text-red-400", estilo === "fondo" && "rounded bg-red-100 px-1 dark:bg-red-950")}>
                                    {cuantos("liquidacion")} de liquidación
                                </span>
                                : comprados hace 12 meses o más, con {datos.reglas.descuento} % de descuento (nunca por debajo del costo).
                            </li>
                            <li>
                                <span className={cn("font-bold text-blue-700 dark:text-blue-400", estilo === "fondo" && "rounded bg-blue-100 px-1 dark:bg-blue-950")}>
                                    {cuantos("nuevo")} nuevos
                                </span>
                                : llegaron en los últimos {datos.reglas.mesesNuevo} meses.
                            </li>
                        </ul>

                        <div className="flex gap-2">
                            <button type="button" onClick={bajarExcel} disabled={armando !== null} className={cn(boton, "border border-border hover:bg-secondary")}>
                                {armando === "excel"
                                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    : <FileSpreadsheet className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
                                Excel
                            </button>
                            <button type="button" onClick={bajarPdf} disabled={armando !== null} className={cn(boton, "bg-primary text-primary-foreground hover:opacity-90")}>
                                {armando === "pdf"
                                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    : <FileText className="h-4 w-4" aria-hidden="true" />}
                                {armando === "pdf" ? "Armando PDF…" : "PDF"}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        {error}
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
