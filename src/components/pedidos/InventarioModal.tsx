"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { X, Search, Filter, Download, FileSpreadsheet, Loader2, Package, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { InventarioDocument } from "./InventarioDocument";
import RequirePermission from "@/components/auth/RequirePermission";
import { BASE_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductoAPI {
    _id?: string;
    sku?: string;
    "Código"?: string;
    Nombre?: string;
    name?: string;
    Marca?: string;
    Ref?: string;
    "Existencia Actual"?: number;
    stock_quantity?: number;
    "Precio Minimo"?: number;
    "Precio Mayor"?: number;
    price?: number;
}

interface ProductoLinea {
    codigo: string;
    nombre: string;
    marca?: string;
    referencia?: string;
    stock: number;
    precio: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function horaActual(): string {
    return new Date().toLocaleString("es-VE", {
        timeZone: "America/Caracas",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function mapToLinea(p: ProductoAPI): ProductoLinea {
    return {
        codigo: p["Código"] || p.sku || "",
        nombre: p.Nombre || p.name || "",
        marca: p.Marca,
        referencia: p.Ref,
        stock: p["Existencia Actual"] ?? p.stock_quantity ?? 0,
        precio: p["Precio Minimo"] ?? p.price ?? 0,
    };
}

function buildParams(search: string, marca: string, soloConStock: boolean, extras?: Record<string, string>) {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    if (marca) p.marca = marca;
    if (soloConStock) p.soloConStock = "true";
    return { ...p, ...extras };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventarioModal({ open, onClose }: Props) {
    const token = useAuthStore((s: any) => s.token);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    // ── Pagination + data ──────────────────────────────────────────────────
    const [productos, setProductos] = useState<ProductoLinea[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [marcasDisponibles, setMarcasDisponibles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // ── Filters ────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [marcaFiltro, setMarcaFiltro] = useState("");
    const [soloConStock, setSoloConStock] = useState(false);

    // ── Export states ──────────────────────────────────────────────────────
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Fetch one page ─────────────────────────────────────────────────────
    const fetchPage = useCallback(async (p: number, s: string, m: string, stock: boolean) => {
        setLoading(true);
        setExportError(null);
        try {
            const params = buildParams(s, m, stock, { page: String(p), limit: String(PAGE_SIZE) });
            const res = await axios.get(`${backendUrl}/productos/inventario`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            const raw: ProductoAPI[] = res.data.data || [];
            setProductos(raw.map(mapToLinea));
            setTotal(res.data.total ?? 0);
            setTotalPages(res.data.totalPages ?? 0);
            // Update brands only when the endpoint sends them (page 1)
            if (res.data.marcasDisponibles?.length) {
                setMarcasDisponibles(res.data.marcasDisponibles);
            }
        } catch {
            setProductos([]);
            setTotal(0);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [token, backendUrl]);

    // ── Fetch ALL for export (no pagination) ──────────────────────────────
    const fetchAll = useCallback(async (s: string, m: string, stock: boolean): Promise<ProductoLinea[]> => {
        const params = buildParams(s, m, stock);
        const res = await axios.get(`${backendUrl}/productos/inventario`, {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        return (res.data.data || []).map(mapToLinea);
    }, [token, backendUrl]);

    // ── Open: reset and load page 1 ────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        setSearch("");
        setMarcaFiltro("");
        setSoloConStock(false);
        setPage(1);
        setExportError(null);
        fetchPage(1, "", "", false);
    }, [open]);

    // ── Filters change: debounce reset to page 1 ──────────────────────────
    useEffect(() => {
        if (!open) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            fetchPage(1, search, marcaFiltro, soloConStock);
        }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search, marcaFiltro, soloConStock]);

    // ── Page change ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        fetchPage(page, search, marcaFiltro, soloConStock);
    }, [page]);

    // ── Excel export ───────────────────────────────────────────────────────
    const descargarExcel = async () => {
        setExportingExcel(true);
        setExportError(null);
        try {
            const todos = await fetchAll(search, marcaFiltro, soloConStock);
            const rows = todos.map(p => ({
                "Código": p.codigo,
                "Descripción": p.nombre,
                "Marca": p.marca || "",
                "Stock": p.stock,
                "Precio $": Number(p.precio.toFixed(2)),
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [{ width: 14 }, { width: 40 }, { width: 20 }, { width: 8 }, { width: 12 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventario");
            XLSX.writeFile(wb, "Inventario_ToyoXpress.xlsx");
        } catch {
            setExportError("No se pudo generar el Excel. Por favor intenta de nuevo.");
        } finally {
            setExportingExcel(false);
        }
    };

    // ── PDF export ─────────────────────────────────────────────────────────
    const descargarPdf = async () => {
        setExportingPdf(true);
        setExportError(null);
        try {
            const todos = await fetchAll(search, marcaFiltro, soloConStock);
            const logoUrl = "https://toyoxpress.com/wp-content/uploads/2017/07/Ai-LOGO-TOYOXPRESS.png";
            const hora = horaActual();
            const filtros = {
                search: search || undefined,
                marca: marcaFiltro || undefined,
                soloConStock: soloConStock || undefined,
            };
            const blob = await pdf(
                <InventarioDocument productos={todos} hora={hora} filtros={filtros} />
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Inventario_ToyoXpress.pdf";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setExportError("No se pudo generar el PDF. Por favor intenta de nuevo.");
        } finally {
            setExportingPdf(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 bg-background border border-border rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] mx-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <img
                            src={`${BASE_URL}/assets/toyoxpress-logo.png`}
                            alt="ToyoXpress"
                            className="h-8 w-auto object-contain hidden sm:block"
                        />
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary sm:hidden" />
                            <h2 className="text-base font-bold text-foreground">Inventario de Productos</h2>
                            {!loading && total > 0 && (
                                <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                                    {total.toLocaleString()} resultados
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* ── Filters ── */}
                <div className="px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0">
                    <div className="flex flex-wrap gap-3 items-end">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o código..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>

                        {/* Marca */}
                        <div className="relative min-w-[160px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <select
                                value={marcaFiltro}
                                onChange={e => setMarcaFiltro(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                            >
                                <option value="">Todas las marcas</option>
                                {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* Solo con stock */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={soloConStock} onChange={e => setSoloConStock(e.target.checked)} />
                                <div className={`w-9 h-5 rounded-full transition-colors ${soloConStock ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${soloConStock ? "translate-x-4" : ""}`} />
                            </div>
                            <span className="text-xs font-medium text-foreground whitespace-nowrap">Solo con stock</span>
                        </label>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Cargando...</span>
                        </div>
                    ) : productos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <Package className="h-8 w-8 opacity-30" />
                            <p className="text-sm">No se encontraron productos.</p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 w-[13%]">Código</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 w-[40%]">Descripción</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 w-[18%]">Modelo</th>
                                    <th className="text-center px-4 py-2.5 font-semibold text-foreground/70 w-[10%]">Stock</th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-foreground/70 w-[19%]">Precio $</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map((p, i) => (
                                    <tr key={i} className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${p.stock === 0 ? "opacity-60" : ""} ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                                        <td className="px-4 py-2 text-foreground/80 font-mono">{p.codigo}</td>
                                        <td className="px-4 py-2 font-medium text-foreground">{p.nombre}</td>
                                        <td className="px-4 py-2 text-foreground/70">{p.marca || "—"}</td>
                                        <td className={`px-4 py-2 text-center font-bold ${p.stock > 0 ? "text-emerald-500" : "text-red-400"}`}>{p.stock}</td>
                                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">${p.precio.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="px-6 py-2.5 border-t border-border/50 flex items-center justify-between bg-muted/10 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                            Página {page} de {totalPages} · {total.toLocaleString()} productos
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {/* Page number pills */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        disabled={loading}
                                        className={`w-7 h-7 text-xs rounded-lg transition-colors ${page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Footer / Export ── */}
                <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                        {exportError && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                {exportError}
                            </div>
                        )}
                        {!exportError && (
                            <p className="text-xs text-muted-foreground">
                                La descarga traerá <strong>todos</strong> los resultado con los filtros activos
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                        {/* Excel */}
                        <RequirePermission perm="verExcel">
                            <button
                                onClick={descargarExcel}
                                disabled={exportingExcel || exportingPdf || total === 0}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-border bg-background hover:bg-muted/60 rounded-xl disabled:opacity-50 transition-colors shadow-sm min-w-[140px] justify-center"
                            >
                                {exportingExcel ? (
                                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparando Excel...</>
                                ) : (
                                    <><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Descargar Excel</>
                                )}
                            </button>
                        </RequirePermission>

                        {/* PDF */}
                        <button
                            onClick={descargarPdf}
                            disabled={exportingPdf || exportingExcel || total === 0}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-50 transition-colors shadow-sm min-w-[140px] justify-center"
                        >
                            {exportingPdf ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparando PDF...</>
                            ) : (
                                <><Download className="h-3.5 w-3.5" /> Descargar PDF</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
