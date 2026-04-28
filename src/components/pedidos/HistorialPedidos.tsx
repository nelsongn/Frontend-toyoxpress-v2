"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/useAuthStore";
import axios from "axios";
import { PedidoStatusBadge } from "./PedidoStatusBadge";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { io } from "socket.io-client";

interface Pedido {
    _id: string;
    correlativo?: number;
    estado: string;
    payload: {
        cliente: { Nombre?: string; Rif?: string };
        total: number;
        productos: { codigo: string }[];
    };
    creadoEn: string;
}

interface Props {
    refreshTrigger?: number;
}

export function HistorialPedidos({ refreshTrigger }: Props) {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state: any) => state.token);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    const LIMIT = 20;

    const fetchPedidos = useCallback(async (currentPage: number) => {
        if (!token) return;
        setLoading(true);
        try {
            const r = await axios.get(`${backendUrl}/pedidos`, {
                params: { page: currentPage, limit: LIMIT },
                headers: { Authorization: `Bearer ${token}` },
            });
            setPedidos(r.data.data || []);
            setTotal(r.data.total || 0);
            setTotalPages(r.data.totalPages || 1);
        } catch { setPedidos([]); }
        finally { setLoading(false); }
    }, [token, backendUrl]);

    useEffect(() => { fetchPedidos(page); }, [page, fetchPedidos, refreshTrigger]);

    useEffect(() => {
        const socketUrl = backendUrl.replace(/\/api\/?$/, "");
        const socketInstance = io(socketUrl, {
            transports: ["websocket"],
            withCredentials: true
        });

        socketInstance.on("pedido_completado", () => {
            fetchPedidos(1);
            setPage(1);
        });

        return () => {
            socketInstance.disconnect();
        };
    }, [backendUrl, fetchPedidos]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{total}</span> pedidos en tu historial
                </p>
            </div>

            <div className="rounded-xl border border-border overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[600px]">
                    <thead>
                        <tr className="bg-muted/60 border-b border-border">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">#</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 text-center">Líneas</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Total</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Estado</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Cargando historial...</td></tr>
                        ) : pedidos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <ClipboardList className="h-8 w-8 opacity-40" />
                                        <p className="text-sm">Aún no tienes pedidos. ¡Crea uno nuevo!</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pedidos.map(p => (
                                <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {p.correlativo ? `#${p.correlativo}` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-foreground">{p.payload?.cliente?.Nombre || '—'}</p>
                                        <p className="text-xs text-muted-foreground">{p.payload?.cliente?.Rif || ''}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">
                                        {p.payload?.productos?.length || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                        ${(p.payload?.total || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <PedidoStatusBadge estado={p.estado} />
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {new Date(p.creadoEn).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Página <span className="font-medium text-foreground">{page}</span> de {totalPages}</span>
                    <div className="flex gap-1.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
