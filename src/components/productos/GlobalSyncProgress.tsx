"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Loader2, CheckCircle2, X } from "lucide-react";

interface SyncProgressData {
    jobId: string;
    totalChunks: number;
    chunksProcessed: number;
    status: "pending" | "processing" | "completed" | "failed";
    metrics: { created: number; updated: number; failed: number };
}

interface CompletionToast {
    visible: boolean;
    metrics: { created: number; updated: number; failed: number } | null;
}

interface PedidoToast {
    visible: boolean;
    correlativo?: number;
    cliente?: string;
    total?: number;
}

export function GlobalSyncProgress() {
    const [syncData, setSyncData] = useState<SyncProgressData | null>(null);
    const [toast, setToast] = useState<CompletionToast>({ visible: false, metrics: null });
    const [pedidoToast, setPedidoToast] = useState<PedidoToast>({ visible: false });
    const lastJobIdRef = useRef<string | null>(null);
    const pedidoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const token = useAuthStore((state: any) => state.token);

    useEffect(() => {
        // Require authentication to connect
        if (!token) return;

        const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        // Strip /api suffix to get the socket server base URL
        const socketUrl = backendApiUrl.replace(/\/api\/?$/, "");

        console.log("[GlobalSyncProgress] Connecting socket to:", socketUrl);

        const socketInstance = io(socketUrl, {
            query: { token },
            transports: ["websocket"],
            withCredentials: true
        });

        socketInstance.on("connect", () => {
            console.log("[GlobalSyncProgress] Socket connected:", socketInstance.id);
        });

        socketInstance.on("connect_error", (err) => {
            console.error("[GlobalSyncProgress] Socket connection error:", err.message);
        });

        socketInstance.on("sync_progress", (data: SyncProgressData) => {
            console.log("[GlobalSyncProgress] sync_progress received:", data);

            // Always track the latest known jobId so we can match the completion event
            if (data.jobId) lastJobIdRef.current = data.jobId;

            // Job is actively running — show the pill
            if (data.status === "processing" || data.status === "pending") {
                setSyncData(data);
            }

            // Job just finished — hide pill and show toast
            // Accept if jobId matches OR if lastJobIdRef was null (client reconnected mid-job)
            if (data.status === "completed") {
                setSyncData(null);
                lastJobIdRef.current = null;
                setToast({ visible: true, metrics: data.metrics });
                setTimeout(() => setToast({ visible: false, metrics: null }), 7000);
            }
        });

        socketInstance.on("pedido_completado", (data: { correlativo: number; cliente: string; total: number }) => {
            if (pedidoTimerRef.current) clearTimeout(pedidoTimerRef.current);
            setPedidoToast({ visible: true, correlativo: data.correlativo, cliente: data.cliente, total: data.total });
            pedidoTimerRef.current = setTimeout(() => setPedidoToast({ visible: false }), 8000);
        });

        return () => {
            socketInstance.disconnect();
            if (pedidoTimerRef.current) clearTimeout(pedidoTimerRef.current);
        };
    }, [token]);

    const isActive = syncData !== null && syncData.totalChunks > 0;
    const porcentaje = isActive
        ? Math.round((syncData.chunksProcessed / syncData.totalChunks) * 100)
        : 0;

    return (
        <>
            {/* ─── Pill in the header while syncing ─── */}
            {isActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    <span className="text-xs font-semibold whitespace-nowrap">
                        Actualización WooCommerce: {porcentaje}%
                    </span>
                </div>
            )}

            {/* ─── Non-invasive bottom-right completion toast ─── */}
            {toast.visible && toast.metrics && (
                <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full">
                    <div className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-5 fade-in duration-400">
                        <div className="bg-emerald-500 h-1.5 w-full" />
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-foreground">¡Carga Completada!</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Sincronización WooCommerce finalizada</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setToast({ visible: false, metrics: null })}
                                    className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-2 py-2">
                                    <p className="text-base font-bold text-emerald-700">{toast.metrics.updated}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Actualizados</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-2">
                                    <p className="text-base font-bold text-blue-700">{toast.metrics.created}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Creados</p>
                                </div>
                                <div className={`rounded-lg px-2 py-2 ${toast.metrics.failed > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}`}>
                                    <p className={`text-base font-bold ${toast.metrics.failed > 0 ? "text-red-600" : "text-gray-600"}`}>{toast.metrics.failed}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">Fallidos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {pedidoToast.visible && (
                <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full">
                    <div className="bg-white dark:bg-gray-900 border border-primary/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-5 fade-in duration-400">
                        <div className="bg-primary h-1.5 w-full" />
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-foreground">
                                            ¡Pedido #{pedidoToast.correlativo} procesado!
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {pedidoToast.cliente} — ${pedidoToast.total?.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-emerald-600 mt-0.5">PDF enviado por email ✓</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPedidoToast({ visible: false })}
                                    className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
