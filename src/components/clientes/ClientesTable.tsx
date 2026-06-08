"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";

interface Cliente {
    _id: string;
    Rif: string;
    Nombre: string;
    Vendedor?: string;
    Telefonos?: string;
    'Correo Electronico'?: string;
    'Tipo de Precio'?: string;
    Estado?: string;
    Ciudad?: string;
}

interface Props {
    refreshTrigger?: number;
}

export function ClientesTable({ refreshTrigger }: Props) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state: any) => state.token);
    const LIMIT = 25;

    const fetchClientes = useCallback(async (currentPage: number, searchTerm: string) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api.get('/clientes', {
                params: { page: currentPage, limit: LIMIT, search: searchTerm },
            });
            setClientes(res.data.data || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchClientes(page, search);
    }, [page, search, fetchClientes, refreshTrigger]);

    const handleSearch = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const precioBadgeColor: Record<string, string> = {
        'Precio Oferta': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Precio Mayor': 'bg-blue-50 text-blue-700 border-blue-200',
        'Precio Minimo': 'bg-amber-50 text-amber-700 border-amber-200',
        'Local': 'bg-purple-50 text-purple-700 border-purple-200',
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 h-9"
                        placeholder="Buscar por nombre, RIF o ciudad..."
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5 ml-auto text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold text-foreground">{total}</span> clientes
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/60 border-b border-border">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">RIF</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Vendedor</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Teléfono</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo Electrónico</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Ciudad</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Tipo Precio</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                                    Cargando clientes...
                                </td>
                            </tr>
                        ) : clientes.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                                    {search ? "No se encontraron resultados para tu búsqueda." : "Aún no hay clientes. Sube un Excel para comenzar."}
                                </td>
                            </tr>
                        ) : (
                            clientes.map((c) => (
                                <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{c.Rif || "—"}</td>
                                    <td className="px-4 py-2.5 font-medium text-foreground">{c.Nombre || "—"}</td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{c.Vendedor || "—"}</td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{c.Telefonos || "—"}</td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground truncate max-w-[150px]" title={c['Correo Electronico']}>{c['Correo Electronico'] || "—"}</td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{c.Ciudad || "—"}</td>
                                    <td className="px-4 py-2.5">
                                        {c['Tipo de Precio'] ? (
                                            <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${precioBadgeColor[c['Tipo de Precio']] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {c['Tipo de Precio']}
                                            </span>
                                        ) : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{c.Estado || "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Página <span className="font-medium text-foreground">{page}</span> de {totalPages}</span>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
