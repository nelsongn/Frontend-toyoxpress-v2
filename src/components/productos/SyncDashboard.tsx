"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, CloudUpload, RefreshCw, Clock } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import axios from "axios";

// Definición de tipos basada en el esquema Mongoose SyncJob
interface SyncMetrics {
    created: number;
    updated: number;
    failed: number;
}

interface ChunkDetail {
    chunkIndex: number;
    created: string[];
    updated: string[];
    failed: string[];
}

interface SyncProgressData {
    jobId: string;
    totalChunks: number;
    chunksProcessed: number;
    totalSKUs?: number;
    status: "pending" | "processing" | "completed" | "failed";
    metrics: SyncMetrics;
    latestChunkInfo?: string;
    latestChunkDetails?: ChunkDetail;
    error?: boolean;
    message?: string;
}

interface LastSyncJob {
    _id: string;
    fileName: string;
    totalSKUs: number;
    totalChunks: number;
    chunksProcessed: number;
    status: string;
    metrics: SyncMetrics;
    updatedAt: string;
}

export function SyncDashboard() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [syncData, setSyncData] = useState<SyncProgressData | null>(null);
    const [chunksHistory, setChunksHistory] = useState<ChunkDetail[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [filter, setFilter] = useState<'all' | 'created' | 'updated' | 'failed'>('all');
    const [lastSync, setLastSync] = useState<LastSyncJob | null>(null);
    const token = useAuthStore((state: any) => state.token);

    useEffect(() => {
        // Fetch last sync job for persistent display
        const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        axios.get(`${backendApiUrl}/productos/last-sync`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            if (res.data?.data) setLastSync(res.data.data);
        }).catch(() => { }); // Silently ignore if no jobs yet
    }, [token]);

    useEffect(() => {
        // Extraemos la URL base (quitando el sufijo /api) para WebSockets nativo
        const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        const socketUrl = backendApiUrl.replace(/\/api\/?$/, "");

        const socketInstance = io(socketUrl, {
            auth: { token }, // Autenticación si el servidor la requiere a futuro
            transports: ["websocket"],
            withCredentials: true
        });

        setSocket(socketInstance);

        socketInstance.on("connect", () => {
            console.log("Conectado al servidor de métricas SQS (Socket ID: " + socketInstance.id + ")");
        });

        socketInstance.on("sync_progress", (data: SyncProgressData) => {
            console.log("Evento SQS Recibido:", data);

            // If job is done, wipe the dashboard back to the empty state
            if (data.status === "completed") {
                setSyncData(null);
                setChunksHistory([]);
                setLogs([]);
                return;
            }

            // Actualizar métricas principales y preservar las anteriores si es un evento de error
            setSyncData(prev => {
                if (!prev) return data;
                // New jobId means a fresh upload: reset chunk history
                if (prev.jobId !== data.jobId) {
                    setChunksHistory([]);
                    setLogs([]);
                }
                return {
                    ...prev,
                    ...data,
                    metrics: data.metrics || prev.metrics
                };
            });

            if (data.latestChunkDetails) {
                setChunksHistory(prev => {
                    if (prev.some(c => c.chunkIndex === data.latestChunkDetails!.chunkIndex)) return prev;
                    return [data.latestChunkDetails!, ...prev];
                });
            }

            if (data.latestChunkInfo) {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${data.latestChunkInfo}`, ...prev]);
            }

            if (data.error && data.message) {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ ERROR: ${data.message}`, ...prev]);
            }
        });

        socketInstance.on("disconnect", () => {
            console.log("Desconectado del servidor de WebSocket");
        });

        return () => {
            socketInstance.disconnect();
        };
    }, [token]);

    // If no active sync, show last sync summary (or initial empty state)
    if (!syncData || syncData.totalChunks === 0) {
        if (lastSync) {
            const lastDate = new Date(lastSync.updatedAt).toLocaleString('es-VE', {
                dateStyle: 'medium', timeStyle: 'short'
            });
            const lastPct = Math.round((lastSync.chunksProcessed / lastSync.totalChunks) * 100);
            return (
                <div className="p-6 space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Última Sincronización</span>
                    </div>
                    <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">{lastSync.fileName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{lastDate}</p>
                            </div>
                            <Badge variant={lastSync.status === 'completed' ? 'default' : 'destructive'} className={lastSync.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}>
                                {lastSync.status === 'completed' ? '✅ Completado' : lastSync.status}
                            </Badge>
                        </div>

                        <div className="pt-1">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{lastSync.chunksProcessed} de {lastSync.totalChunks} paquetes ({lastSync.totalSKUs} SKUs)</span>
                                <span>{lastPct}%</span>
                            </div>
                            <Progress value={lastPct} className="h-1.5" />
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="text-center">
                                <p className="text-lg font-bold text-emerald-600">{lastSync.metrics.updated}</p>
                                <p className="text-[10px] text-muted-foreground">Actualizados</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-blue-600">{lastSync.metrics.created}</p>
                                <p className="text-[10px] text-muted-foreground">Creados</p>
                            </div>
                            <div className="text-center">
                                <p className={`text-lg font-bold ${lastSync.metrics.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>{lastSync.metrics.failed}</p>
                                <p className="text-[10px] text-muted-foreground">Fallidos</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">Sube un nuevo Excel para iniciar otra sincronización.</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground animate-in fade-in zoom-in duration-500">
                <CloudUpload className="h-16 w-16 mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-foreground">Esperando Carga de Inventario</h3>
                <p className="max-w-sm mt-2">
                    Cuando subas un archivo Excel, el proceso asíncrono hacia WooCommerce comenzará y verás las métricas aquí.
                </p>
            </div>
        );
    }

    const porcentaje = Math.round((syncData.chunksProcessed / syncData.totalChunks) * 100);
    const isFinished = syncData.status === "completed";

    return (
        <div className="p-6 space-y-6">
            {/* Header Resumen */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Progreso Global de Subida</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h2 className="text-3xl font-bold">{porcentaje}%</h2>
                        <div className="flex flex-col ml-1 justify-end pb-1">
                            {syncData.totalSKUs ? (
                                <span className="text-sm font-semibold text-foreground mb-0.5">
                                    {(syncData.metrics.created + syncData.metrics.updated + syncData.metrics.failed)} de {syncData.totalSKUs} Productos
                                </span>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                                ({syncData.chunksProcessed} de {syncData.totalChunks} Paquetes)
                            </span>
                        </div>
                    </div>
                </div>
                <div>
                    {isFinished ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-3 py-1 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Completado
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Procesando SQS
                        </Badge>
                    )}
                </div>
            </div>

            <div className={isFinished ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500"}>
                <Progress value={porcentaje} className="h-2 w-full bg-secondary" />
            </div>

            {/* KPIs de WooCommerce */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div
                    onClick={() => setFilter(filter === 'updated' ? 'all' : 'updated')}
                    className={`space-y-1 p-2 rounded-md cursor-pointer transition-colors ${filter === 'updated' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-muted'}`}
                >
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Act. Exitosos
                    </p>
                    <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{syncData.metrics.updated}</p>
                </div>
                <div
                    onClick={() => setFilter(filter === 'created' ? 'all' : 'created')}
                    className={`space-y-1 p-2 rounded-md cursor-pointer transition-colors ${filter === 'created' ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-muted'}`}
                >
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Nuevos Creados
                    </p>
                    <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{syncData.metrics.created}</p>
                </div>
                <div
                    onClick={() => setFilter(filter === 'failed' ? 'all' : 'failed')}
                    className={`space-y-1 p-2 rounded-md cursor-pointer transition-colors ${filter === 'failed' ? 'bg-red-500/10 border border-red-500/30' : 'hover:bg-muted'}`}
                >
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Rechazados (Fallos)
                    </p>
                    <p className={`text-2xl font-semibold ${syncData.metrics.failed > 0 ? "text-destructive" : "text-foreground"}`}>
                        {syncData.metrics.failed}
                    </p>
                </div>
            </div>

            {syncData.metrics.failed > 0 && !isFinished && (
                <Alert variant="destructive" className="animate-pulse">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Advertencia en WooCommerce</AlertTitle>
                    <AlertDescription>
                        Algunos SKUs de este paquete fueron rechazados por WP. Revisa el registro abajo.
                    </AlertDescription>
                </Alert>
            )}

            {/* Consola de Historial Detallada */}
            <div className="pt-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Desglose de Paquetes Sincronizados</p>
                <ScrollArea className="h-[280px] w-full rounded-md border border-border/40 p-4 bg-muted/20">
                    <div className="flex flex-col gap-4">
                        {chunksHistory.length === 0 ? (
                            <div className="text-emerald-500 italic text-sm">Esperando recepción del primer paquete detallado...</div>
                        ) : (
                            chunksHistory.map((chunk, i) => (
                                <div key={i} className="bg-card border rounded-lg p-3 space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        Paquete #{chunk.chunkIndex}
                                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
                                            {chunk.created.length + chunk.updated.length + chunk.failed.length} SKUs procesados
                                        </Badge>
                                    </h4>

                                    {(filter === 'all' || filter === 'created') && chunk.created.length > 0 && (
                                        <div className="text-xs space-y-1">
                                            <p className="text-blue-600 font-medium">✨ Creados ({chunk.created.length}):</p>
                                            <div className="flex flex-wrap gap-1">
                                                {chunk.created.map((s, idx) => <span key={idx} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{s}</span>)}
                                            </div>
                                        </div>
                                    )}

                                    {(filter === 'all' || filter === 'updated') && chunk.updated.length > 0 && (
                                        <div className="text-xs space-y-1 mt-2">
                                            <p className="text-emerald-600 font-medium">✅ Actualizados ({chunk.updated.length}):</p>
                                            <div className="flex flex-wrap gap-1">
                                                {chunk.updated.map((s, idx) => <span key={idx} className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{s}</span>)}
                                            </div>
                                        </div>
                                    )}

                                    {(filter === 'all' || filter === 'failed') && chunk.failed.length > 0 && (
                                        <div className="text-xs space-y-1 mt-2">
                                            <p className="text-red-500 font-medium">❌ Rechazados ({chunk.failed.length}):</p>
                                            <ul className="list-disc pl-4 text-red-500/80">
                                                {chunk.failed.map((s, idx) => <li key={idx}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
