"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { CartTable } from "./CartTable";
import { PedidoDocument } from "./PedidoDocument";
const InventarioModal = dynamic(() => import("./InventarioModal").then(mod => mod.InventarioModal), {
    ssr: false,
    loading: () => null
});
import {
    Search, UserRound, Package, X, Send, Plus,
    Tag, ChevronDown, Download, BookOpen
} from "lucide-react";
import Swal from "sweetalert2";

// PDFDownloadLink must be dynamically imported to prevent SSR errors in Next.js
const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    { ssr: false, loading: () => null }
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Cliente {
    _id: string;
    Rif: string;
    Nombre: string;
    Telefonos?: string;
    'Correo Electronico'?: string;
    'Tipo de Precio'?: string;
    Estado?: string;
    Ciudad?: string;
    Direccion?: string;
}

interface Producto {
    _id: string;
    sku: string;       // same as Código in Excel
    name: string;      // same as Nombre in Excel
    brands?: string;
    Marca?: string;
    Modelo?: string;
    Ref?: string;
    'Precio Minimo'?: number;
    'Precio Mayor'?: number;
    'Precio Oferta'?: number;
    'Existencia Actual'?: number;
    stock_quantity?: number;
}

interface Linea {
    codigo: string;
    nombre: string;
    marca?: string;
    referencia?: string;
    cantidad: number | '';
    precio: number;
    total: number;
    stockMax?: number;
    // Price points for recalculation
    pMin: number;
    pMayor: number;
    pOferta: number;
}

interface Props {
    onSuccess?: () => void;
}

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
        hour12: true,
    });
}

const TIPO_PRECIO_MAP: Record<string, (p: Producto) => number> = {
    'Precio Oferta': p => Number(p['Precio Oferta'] || p['Precio Minimo'] || 0),
    'Precio Mayor': p => Number(p['Precio Mayor'] || 0),
    'Precio Minimo': p => Number(p['Precio Minimo'] || 0),
    'Local': p => Number(p['Precio Minimo'] || 0),
};

function getPrecio(producto: Producto, tipoPrecio?: string): number {
    if (!tipoPrecio) return Number(producto['Precio Minimo'] || 0);
    const fn = TIPO_PRECIO_MAP[tipoPrecio.trim()];
    return fn ? fn(producto) : Number(producto['Precio Minimo'] || 0);
}

const PRECIO_BADGE: Record<string, string> = {
    'Precio Oferta': 'bg-emerald-50 text-emerald-700',
    'Precio Mayor': 'bg-blue-50 text-blue-700',
    'Precio Minimo': 'bg-amber-50 text-amber-700',
    'Local': 'bg-purple-50 text-purple-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VentaForm({ onSuccess }: Props) {
    const token = useAuthStore((state: any) => state.token);
    const vendedor = useAuthStore((state: any) => state.name) || "Vendedor";
    const consultarPrecios = useAuthStore((state: any) => state.permissions?.consultarPrecios);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    // Client search
    const [clienteQuery, setClienteQuery] = useState("");
    const [clienteResults, setClienteResults] = useState<Cliente[]>([]);
    const [clienteLoading, setClienteLoading] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const clienteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Product search
    const [productoQuery, setProductoQuery] = useState("");
    const [productoResults, setProductoResults] = useState<Producto[]>([]);
    const [productoLoading, setProductoLoading] = useState(false);
    const productoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cart
    const [carrito, setCarrito] = useState<Linea[]>([]);

    // Order extras
    const [notaPedido, setNotaPedido] = useState("");
    const [notaCorreo, setNotaCorreo] = useState("");
    const [emails, setEmails] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState("");
    const [sending, setSending] = useState(false);

    // Inventory modal
    const [showInventario, setShowInventario] = useState(false);
    const [tipoPrecio, setTipoPrecio] = useState<string>("Precio Minimo");

    // ── Sync Price Type with Client ─────────────────────────────────────────
    useEffect(() => {
        if (selectedCliente?.['Tipo de Precio']) {
            setTipoPrecio(selectedCliente['Tipo de Precio'].trim());
        } else {
            setTipoPrecio("Precio Minimo");
        }
    }, [selectedCliente?._id]);

    // ── Recalculate Cart when Price Type changes ────────────────────────────
    useEffect(() => {
        setCarrito(prev => prev.map(line => {
            let newPrice = line.pMin;
            if (tipoPrecio === 'Precio Mayor') newPrice = line.pMayor || line.pMin;
            if (tipoPrecio === 'Precio Oferta') newPrice = line.pOferta || line.pMin;
            
            return {
                ...line,
                precio: newPrice,
                total: newPrice * (Number(line.cantidad) || 0)
            };
        }));
    }, [tipoPrecio]);

    // ── Client search ──────────────────────────────────────────────────────

    const buscarClientes = useCallback((q: string) => {
        if (clienteTimeout.current) clearTimeout(clienteTimeout.current);
        if (!q.trim()) { setClienteResults([]); return; }
        clienteTimeout.current = setTimeout(async () => {
            setClienteLoading(true);
            try {
                const r = await api.get(`/clientes`, {
                    params: { search: q, limit: 8 },
                });
                setClienteResults(r.data.data || []);
            } catch { setClienteResults([]); }
            finally { setClienteLoading(false); }
        }, 350);
    }, [token, backendUrl]);

    // ── Product search ─────────────────────────────────────────────────────

    const buscarProductos = useCallback((q: string) => {
        if (productoTimeout.current) clearTimeout(productoTimeout.current);
        if (!q.trim()) { setProductoResults([]); return; }
        productoTimeout.current = setTimeout(async () => {
            setProductoLoading(true);
            try {
                const r = await api.get(`/productos`, {
                    params: { search: q, limit: 10 },
                });
                setProductoResults(r.data.data || []);
            } catch { setProductoResults([]); }
            finally { setProductoLoading(false); }
        }, 350);
    }, [token, backendUrl]);

    // ── Cart operations ────────────────────────────────────────────────────

    const agregarProducto = async (p: Producto) => {
        const stock = Number(p['Existencia Actual'] || p.stock_quantity || 0);
        if (stock <= 0) {
            Swal.fire('', 'Este producto no tiene stock disponible.', 'warning');
            return;
        }

        const { value: quantity } = await Swal.fire({
            title: 'Añadir al Carrito',
            text: `¿Cuántas unidades de "${p.name}" desea añadir? (Stock: ${stock})`,
            input: 'number',
            inputAttributes: {
                min: '1',
                max: stock.toString(),
                step: '1'
            },
            inputValue: 1,
            showCancelButton: true,
            confirmButtonText: 'Añadir',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || parseInt(value) <= 0) {
                    return 'Ingrese una cantidad válida';
                }
                if (parseInt(value) > stock) {
                    return `Solo hay ${stock} unidades disponibles`;
                }
            }
        });

        if (!quantity) return;
        const q = parseInt(quantity);

        const precio = getPrecio(p, selectedCliente?.['Tipo de Precio']);
        const yaExiste = carrito.findIndex(l => l.codigo === p.sku);

        if (yaExiste >= 0) {
            // Increment existing line
            const updated = [...carrito];
            const currentQty = Number(updated[yaExiste].cantidad) || 0;
            if (currentQty + q > stock) {
                Swal.fire('', `Solo hay ${stock} unidades en stock totales. Se ajustó al máximo.`, 'warning');
                updated[yaExiste].cantidad = stock;
            } else {
                updated[yaExiste].cantidad = currentQty + q;
            }
            updated[yaExiste].total = updated[yaExiste].cantidad * updated[yaExiste].precio;
            setCarrito(updated);
        } else {
            setCarrito(prev => {
                const newCart = [...prev, {
                    codigo: p.sku,
                    nombre: p.name,
                    marca: p.brands || p.Marca,
                    modelo: p.Modelo || "",
                    referencia: p.Ref,
                    cantidad: q,
                    precio,
                    total: precio * q,
                    stockMax: stock,
                    pMin: Number(p['Precio Minimo'] || 0),
                    pMayor: Number(p['Precio Mayor'] || 0),
                    pOferta: Number(p['Precio Oferta'] || 0),
                }];
                // Ordenar alfabéticamente por referencia como en la V1
                return newCart.sort((a, b) => {
                    const rA = String(a.referencia || '');
                    const rB = String(b.referencia || '');
                    return rA < rB ? -1 : (rA > rB ? 1 : 0);
                });
            });
        }
        setProductoQuery("");
        setProductoResults([]);
    };

    const cambiarCantidad = (idx: number, val: number | '') => {
        const updated = [...carrito];
        const stockMax = updated[idx].stockMax || 999999;
        let qty: number | '' = val === '' ? '' : Number(val);

        if (typeof qty === 'number' && qty > stockMax) {
            Swal.fire('', `Solo hay ${stockMax} unidades en stock.`, 'warning');
            qty = stockMax;
        }

        updated[idx].cantidad = qty;
        updated[idx].total = (Number(qty) || 0) * updated[idx].precio;
        setCarrito(updated);
    };

    const eliminarLinea = (idx: number) => setCarrito(prev => prev.filter((_, i) => i !== idx));

    // ── Email extras ───────────────────────────────────────────────────────

    const addEmail = () => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (re.test(emailInput.trim()) && !emails.includes(emailInput.trim())) {
            setEmails(prev => [...prev, emailInput.trim()]);
            setEmailInput("");
        }
    };

    // ── Submit ─────────────────────────────────────────────────────────────

    const enviarPedido = async () => {
        if (!selectedCliente) { Swal.fire('', 'Selecciona un cliente primero.', 'warning'); return; }
        if (carrito.length === 0) { Swal.fire('', 'El carrito está vacío.', 'warning'); return; }

        setSending(true);
        try {
            const carritoLimpio = carrito.map(l => ({
                ...l,
                cantidad: Number(l.cantidad) || 1,
                total: (Number(l.cantidad) || 1) * l.precio
            }));

            const total = carritoLimpio.reduce((s, l) => s + l.total, 0);
            const items = carritoLimpio.reduce((s, l) => s + l.cantidad, 0);

            await api.post(`/pedidos`, {
                data: {
                    cliente: selectedCliente,
                    vendedor: useAuthStore.getState().name || 'Vendedor',
                    productos: carritoLimpio,
                    total,
                    items,
                    notaPedido,
                    notaCorreo,
                    emails,
                    hora: new Date().toLocaleString('es-VE'),
                },
            });

            Swal.fire({
                icon: 'success',
                title: '¡Pedido enviado!',
                html: `El pedido para <b>${selectedCliente.Nombre}</b> fue encolado correctamente. Recibirás el PDF por email cuando se procese.`,
                confirmButtonText: 'OK',
            });

            // Reset form
            setSelectedCliente(null);
            setCarrito([]);
            setNotaPedido("");
            setNotaCorreo("");
            setEmails([]);
            setClienteQuery("");
            onSuccess?.();

        } catch (e: any) {
            Swal.fire('Error', e.response?.data?.message || 'No se pudo enviar el pedido.', 'error');
        } finally {
            setSending(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="flex flex-col gap-5">

                {/* ── Cliente ─────────────────────────────────────────────── */}
                <div className="bg-card rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5" /> Cliente
                    </p>
                    {selectedCliente ? (
                        <div className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{selectedCliente.Nombre}</p>
                                <p className="text-xs text-muted-foreground">RIF: {selectedCliente.Rif} · {selectedCliente.Ciudad}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${PRECIO_BADGE[tipoPrecio] || 'bg-gray-100 text-gray-600'}`}>
                                        <Tag className="h-2.5 w-2.5" /> Precio Aplicado: {tipoPrecio}
                                    </span>
                                    {selectedCliente['Tipo de Precio'] && selectedCliente['Tipo de Precio'].trim() !== tipoPrecio && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground opacity-70">
                                            <Tag className="h-2.5 w-2.5" /> Cliente: {selectedCliente['Tipo de Precio']}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => { setSelectedCliente(null); setCarrito([]); }} className="text-muted-foreground hover:text-destructive mt-0.5">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9 h-9"
                                placeholder="Buscar cliente por nombre o RIF..."
                                value={clienteQuery}
                                onChange={e => { setClienteQuery(e.target.value); buscarClientes(e.target.value); }}
                            />
                            {(clienteLoading || clienteResults.length > 0) && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
                                    {clienteLoading ? (
                                        <p className="text-xs text-muted-foreground px-4 py-3">Buscando...</p>
                                    ) : clienteResults.map(c => (
                                        <button key={c._id} onClick={() => { setSelectedCliente(c); setClienteResults([]); setClienteQuery(""); }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors">
                                            <p className="text-sm font-medium">{c.Nombre}</p>
                                            <p className="text-xs text-muted-foreground">{c.Rif} · {c['Tipo de Precio'] || '—'}</p>
                                        </button>
                                    ))}
                                    {!clienteLoading && clienteResults.length === 0 && (
                                        <p className="text-xs text-muted-foreground px-4 py-3">Sin resultados.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Producto search ──────────────────────────────────────── */}
                {selectedCliente && (
                    <div className="bg-card rounded-xl border border-border p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Agregar Producto</span>
                        </p>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9 h-9"
                                placeholder="Buscar por código, descripción..."
                                value={productoQuery}
                                onChange={e => { setProductoQuery(e.target.value); buscarProductos(e.target.value); }}
                            />
                            {(productoLoading || productoResults.length > 0) && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto">
                                    {productoLoading ? (
                                        <p className="text-xs text-muted-foreground px-4 py-3">Buscando...</p>
                                    ) : productoResults.length === 0 ? (
                                        <p className="text-xs text-muted-foreground px-4 py-3">Sin resultados.</p>
                                    ) : productoResults.map(p => {
                                        let precio = getPrecio(p, tipoPrecio);
                                        const stock = Number(p['Existencia Actual'] ?? p.stock_quantity ?? 0);
                                        return (
                                            <button key={p._id} onClick={() => agregarProducto(p)}
                                                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 flex items-center justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-mono text-muted-foreground">
                                                        {p.sku} {p.Ref && <span className="ml-2 text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded text-[10px]">REF: {p.Ref}</span>}
                                                    </p>
                                                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {consultarPrecios && <p className="text-sm font-bold text-primary">${precio.toFixed(2)}</p>}
                                                    <p className={`text-[10px] ${stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        Stock: {stock}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Cart ─────────────────────────────────────────────────── */}
                {selectedCliente && (
                    <div className="bg-card rounded-xl border border-border p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Carrito</p>
                        <CartTable lineas={carrito} onCantidadChange={cambiarCantidad} onRemove={eliminarLinea} />
                    </div>
                )}

                {/* ── Notas + emails ────────────────────────────────────────── */}
                {selectedCliente && carrito.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Nota del Pedido</label>
                                <textarea
                                    rows={3}
                                    value={notaPedido}
                                    onChange={e => setNotaPedido(e.target.value)}
                                    placeholder="Instrucciones para bodega..."
                                    className="w-full resize-none text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Nota del Correo</label>
                                <textarea
                                    rows={3}
                                    value={notaCorreo}
                                    onChange={e => setNotaCorreo(e.target.value)}
                                    placeholder="Mensaje para el email..."
                                    className="w-full resize-none text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        {/* CC emails */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">CC (correos adicionales)</label>
                            <div className="flex gap-2">
                                <Input
                                    className="h-8 text-sm"
                                    placeholder="correo@ejemplo.com"
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addEmail()}
                                />
                                <button onClick={addEmail} className="shrink-0 bg-muted hover:bg-muted/80 rounded-md px-3 transition-colors">
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            {emails.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {emails.map(e => (
                                        <span key={e} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                                            {e} <button onClick={() => setEmails(prev => prev.filter(x => x !== e))}><X className="h-2.5 w-2.5" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Actions ──────────────────────────────────────────────── */}
                {selectedCliente && carrito.length > 0 && (
                    <div className="flex gap-3">
                        {/* Download button */}
                        <PDFDownloadLink
                            document={
                                <PedidoDocument
                                    cliente={selectedCliente}
                                    lineas={carrito.map(l => ({
                                        ...l,
                                        cantidad: Number(l.cantidad) || 1,
                                        total: (Number(l.cantidad) || 1) * l.precio,
                                    }))}
                                    total={carrito.reduce((s, l) => s + (Number(l.cantidad) || 1) * l.precio, 0)}
                                    notaPedido={notaPedido}
                                    vendedor={vendedor}
                                    hora={horaActual()}
                                />
                            }
                            fileName={`Pedido_${selectedCliente.Nombre.replace(/\s+/g, "_")}.pdf`}
                            className="flex-1"
                        >
                            {({ loading }) => (
                                <button
                                    type="button"
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 w-full border border-border bg-card text-foreground hover:bg-muted/60 disabled:opacity-60 rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm"
                                >
                                    <Download className="h-4 w-4" />
                                    {loading ? "Generando PDF..." : "Descargar Pedido"}
                                </button>
                            )}
                        </PDFDownloadLink>

                        {/* Send button */}
                        <button
                            onClick={enviarPedido}
                            disabled={sending}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm"
                        >
                            <Send className="h-4 w-4" />
                            {sending ? "Enviando pedido..." : "Enviar Pedido"}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Inventory Modal ───────────────────────────────────────────── */}
            <InventarioModal
                open={showInventario}
                onClose={() => setShowInventario(false)}
            />
        </>
    );
}
