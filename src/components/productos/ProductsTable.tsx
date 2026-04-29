"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";

interface Producto {
    _id: string;
    Nombre: string;
    Código: string;
    Marca?: string;
    Modelo?: string;
    "Existencia Actual": number;
    "Precio Minimo": number;
    "Precio Mayor": number;
    "Precio Oferta": number;
}

export function ProductsTable() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const token = useAuthStore((state: any) => state.token);

    const fetchProductos = async (currentPage: number, searchTerm: string) => {
        try {
            setLoading(true);
            const res = await api.get(`/productos?page=${currentPage}&limit=10&search=${searchTerm}`);
            setProductos(res.data.data);
            setTotalPages(res.data.totalPages);
            setTotal(res.data.total);
        } catch (error) {
            console.error("Error al obtener productos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            // Un pequeño debounce para la búsqueda
            const timer = setTimeout(() => {
                fetchProductos(page, search);
            }, 500);

            // Escuchar el evento de carga del Excel para recargar la tabla solitos
            const handleRefresh = () => fetchProductos(page, search);
            window.addEventListener("local_inventory_updated", handleRefresh);

            return () => {
                clearTimeout(timer);
                window.removeEventListener("local_inventory_updated", handleRefresh);
            }
        }
    }, [page, search, token]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset to page 1 on new search
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por Nombre o SKU..."
                        className="pl-8 bg-background"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <Badge variant="secondary" className="px-3 py-1 font-normal bg-muted">
                    {total} Productos Locales
                </Badge>
            </div>

            <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">P. Mín</TableHead>
                            <TableHead className="text-right">P. Oferta</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Cargando inventario...</p>
                                </TableCell>
                            </TableRow>
                        ) : productos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No se encontraron productos.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            productos.map((producto) => (
                                <TableRow key={producto._id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-mono text-xs">{producto.Código}</TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={producto.Nombre}>
                                        {producto.Nombre}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal text-[10px] uppercase">
                                            {producto.Modelo || 'S/M'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={`font-medium ${producto["Existencia Actual"] > 0 ? "text-emerald-500" : "text-destructive"}`}>
                                            {producto["Existencia Actual"]}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        ${producto["Precio Minimo"]?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                        ${producto["Precio Oferta"]?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Mostrando página {page} de {totalPages || 1}
                </p>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || totalPages === 0 || loading}
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
