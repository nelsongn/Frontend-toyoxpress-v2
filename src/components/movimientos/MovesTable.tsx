"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pen, Trash2, Check, ChevronsUpDown, X } from "lucide-react";
import ViewMoveModal from "./ViewMoveModal";
import MoveModal from "./MoveModal";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import RequirePermission from "@/components/auth/RequirePermission";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function MovesTable() {
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Sort State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState("id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // Financial Totals
    const [saldoTotal, setSaldoTotal] = useState(0);
    const [cajaChica, setCajaChica] = useState(0);

    // Helper for initial dates
    const getInitialDates = () => {
        const today = new Date();
        const past = new Date();
        past.setMonth(today.getMonth() - 3);
        const format = (d: Date) => {
            const tzOffset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
        };
        return { inicio: format(past), cierre: format(today) };
    };

    const initialDates = getInitialDates();

    // Filters state (extended based on user request)
    const [filters, setFilters] = useState({
        movimiento: "",
        cuenta: "",
        concepto: "",
        vale: "",
        usuario: "",
        tipoPago: "",
        fechaInicio: initialDates.inicio,
        fechaCierre: initialDates.cierre,
        status: "no_verificados"
    });

    // Modal State
    const [selectedViewMove, setSelectedViewMove] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [moveToEdit, setMoveToEdit] = useState<any | null>(null);

    // Filter & Pagination UI States
    const [usuariosDB, setUsuariosDB] = useState<string[]>([]);
    const [openUserSelect, setOpenUserSelect] = useState(false);
    const [inputPage, setInputPage] = useState(page.toString());
    const [cuentasDB, setCuentasDB] = useState<any[]>([]);

    useEffect(() => {
        setInputPage(page.toString());
    }, [page]);

    const fetchMovimientos = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            params.append('sortBy', sortBy);
            params.append('sortOrder', sortOrder);
            if (filters.movimiento) params.append('movimiento', filters.movimiento);
            if (filters.cuenta) params.append('cuenta', filters.cuenta);
            if (filters.concepto) params.append('concepto', filters.concepto);
            if (filters.vale) params.append('vale', filters.vale);
            if (filters.usuario) params.append('usuario', filters.usuario);
            if (filters.status) params.append('status', filters.status);
            if (filters.tipoPago) params.append('tipoPago', filters.tipoPago);
            if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
            if (filters.fechaCierre) params.append('fechaCierre', filters.fechaCierre);

            const res = await api.get(`/movimientos?${params.toString()}`);
            if (res.data.success) {
                setMovimientos(res.data.movimientos);
                setSaldoTotal(res.data.saldo_total || 0);
                setCajaChica(res.data.caja_chica || 0);
                // Assume backend returns totalPages natively based on standard implementations
                if (res.data.totalPages) {
                    setTotalPages(res.data.totalPages);
                } else if (res.data.total) {
                    setTotalPages(Math.ceil(res.data.total / limit) || 1);
                }
            }
        } catch (error) {
            console.error("Error fetching movimientos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Use a short timeout to debounce typing in filter inputs
        const timeoutId = setTimeout(() => {
            fetchMovimientos();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [filters, page, limit, sortBy, sortOrder]);

    // Reset page to 1 whenever filters change
    useEffect(() => {
        setPage(1);
    }, [filters]);

    // Load available users and cuentas for the filter comboboxes
    useEffect(() => {
        const loadFiltersData = async () => {
            try {
                const [resUsers, resCuentas] = await Promise.all([
                    api.get('/movimientos/usuarios'),
                    api.get('/cuentas')
                ]);

                if (resUsers.data.success) {
                    setUsuariosDB(resUsers.data.usuarios || []);
                }
                if (resCuentas.data.success) {
                    setCuentasDB(resCuentas.data.cuentas || []);
                }
            } catch (error) {
                console.error("Error fetching filter data:", error);
            }
        };
        loadFiltersData();
    }, []);

    useEffect(() => {
        const handleRefresh = () => fetchMovimientos();
        window.addEventListener("refresh_movimientos", handleRefresh);

        return () => window.removeEventListener("refresh_movimientos", handleRefresh);
    }, []);

    const formatMoneda = (val: number) => {
        // We want the format from image: "8,30 US$" or "-70,00 US$"
        // Using simple format logic to match
        const formatted = Math.abs(val).toFixed(2).replace('.', ',');
        return val < 0 ? `-${formatted} US$` : `${formatted} US$`;
    };

    const getIdentificadorColor = (id: string | undefined) => {
        if (!id) return "bg-gray-500 text-white";
        return id.startsWith("E-") ? "bg-[#d32f2f] hover:bg-[#b71c1c] text-white" : "bg-[#1f8b4c] hover:bg-[#1b5e20] text-white";
    };

    const getStatusColor = (status: string | undefined) => {
        if (status === 'Pendiente') return 'bg-[#d32f2f] hover:bg-[#b71c1c] text-white'
        return 'bg-[#7cb342] hover:bg-[#558b2f] text-white' // default green approved layout
    };

    const handleEditClick = (move: any) => {
        setMoveToEdit(move);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-4">

            {/* Top Filter and Totals Bar (Re-designed to match image) */}
            <div className="bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Filtros de busqueda de movimientos</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Tipo de movimiento</span>
                        <Select
                            value={filters.movimiento}
                            onValueChange={(val) => setFilters(f => ({ ...f, movimiento: val === "all" ? "" : val }))}
                        >
                            <SelectTrigger className="h-9 w-full bg-background border-input">
                                <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Select...</SelectItem>
                                <SelectItem value="ingreso">Ingreso</SelectItem>
                                <SelectItem value="egreso">Egreso</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Name</span>
                        <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openUserSelect}
                                    className="w-full justify-between h-9 px-3 font-normal"
                                >
                                    <span className="truncate">{filters.usuario || "Select..."}</span>
                                    {filters.usuario ? (
                                        <div
                                            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer"
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                setFilters(f => ({ ...f, usuario: "" }));
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup className="max-h-64 overflow-y-auto">
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    setFilters(f => ({ ...f, usuario: "" }));
                                                    setOpenUserSelect(false);
                                                }}
                                            >
                                                Select...
                                            </CommandItem>
                                            {usuariosDB.map((usr) => (
                                                <CommandItem
                                                    key={usr}
                                                    value={usr}
                                                    onSelect={(currentValue) => {
                                                        const newVal = currentValue === filters.usuario.toLowerCase() ? "" : usr;
                                                        setFilters(f => ({ ...f, usuario: newVal }));
                                                        setOpenUserSelect(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            filters.usuario === usr ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {usr}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Cuenta</span>
                        <Select
                            value={filters.cuenta}
                            onValueChange={(val) => setFilters(f => ({ ...f, cuenta: val === "all" ? "" : val }))}
                        >
                            <SelectTrigger className="h-9 w-full bg-background border-input">
                                <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Select...</SelectItem>
                                {cuentasDB.map((cuenta: any) => (
                                    <SelectItem key={cuenta._id || cuenta.value} value={cuenta.value}>
                                        {cuenta.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Nro de aprobacion</span>
                        <Input
                            placeholder=""
                            className="h-9 w-full"
                            value={filters.vale}
                            onChange={(e) => setFilters(f => ({ ...f, vale: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Tipo de pago</span>
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            value={filters.tipoPago}
                            onChange={(e) => setFilters(f => ({ ...f, tipoPago: e.target.value }))}
                        >
                            <option value="">Select...</option>
                            <option value="bs">Bs</option>
                            <option value="zelle">Zelle</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <span className="text-sm font-medium text-foreground">Concepto</span>
                        <Input
                            placeholder=""
                            className="h-9 w-full"
                            value={filters.concepto}
                            onChange={(e) => setFilters(f => ({ ...f, concepto: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Legacy V1 layout: Summary Pills immediately under Filters row */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-muted/40 rounded-lg pt-2 pb-2 mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Caja Chica:</span>
                        <div className={`px-[6px] py-[2px] rounded-[5px] text-white font-bold text-[16px] leading-tight ${cajaChica >= 0 ? "bg-[green]" : "bg-[#B21F00]"
                            }`}>
                            {cajaChica.toFixed(2)}$
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <span className="text-sm font-medium">Saldo Total:</span>
                        <div className={`px-[6px] py-[2px] rounded-[5px] text-white font-bold text-[16px] leading-tight ${saldoTotal >= 0 ? "bg-[green]" : "bg-[#B21F00]"
                            }`}>
                            {saldoTotal.toFixed(2)}$
                        </div>
                    </div>
                </div>


                {/* Bottom Filter options: Dates and status */}
                <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex gap-4">
                        <div className="space-y-1">
                            <span className="text-sm font-medium block">Fecha de inicio:</span>
                            <input
                                type="date"
                                className="bg-[#a32240] text-white px-3 py-1.5 rounded-md text-sm cursor-pointer outline-none"
                                value={filters.fechaInicio}
                                onChange={(e) => setFilters(f => ({ ...f, fechaInicio: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm font-medium block">Fecha de cierre:</span>
                            <input
                                type="date"
                                className="bg-[#a32240] text-white px-3 py-1.5 rounded-md text-sm cursor-pointer outline-none"
                                value={filters.fechaCierre}
                                onChange={(e) => setFilters(f => ({ ...f, fechaCierre: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-end mb-1">
                            <Button onClick={fetchMovimientos} disabled={loading} className="bg-[#a32240] hover:bg-[#851b32] h-[34px] w-[34px] p-0 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-base font-bold block text-center">Status de movimiento</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name="status" checked={filters.status === "todos"} onChange={() => setFilters(f => ({ ...f, status: "todos" }))} />
                                <span className="text-sm">Todos</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name="status" checked={filters.status === "no_verificados"} onChange={() => setFilters(f => ({ ...f, status: "no_verificados" }))} />
                                <span className="text-sm">No verificados</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name="status" checked={filters.status === "verificados"} onChange={() => setFilters(f => ({ ...f, status: "verificados" }))} />
                                <span className="text-sm">Verificados</span>
                            </label>
                        </div>
                    </div>
                </div>

            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between bg-card border rounded-lg p-2 mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Mostrar:</span>
                    <Select
                        value={limit.toString()}
                        onValueChange={(val) => {
                            setLimit(Number(val));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px] bg-background border-input">
                            <SelectValue placeholder={limit.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                        Página
                        <Input
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const p = parseInt(inputPage);
                                    if (!isNaN(p) && p >= 1 && p <= totalPages) {
                                        setPage(p);
                                    } else {
                                        setInputPage(page.toString());
                                    }
                                }
                            }}
                            onBlur={() => {
                                const p = parseInt(inputPage);
                                if (!isNaN(p) && p >= 1 && p <= totalPages) {
                                    setPage(p);
                                } else {
                                    setInputPage(page.toString());
                                }
                            }}
                            className="w-14 h-8 text-center px-1"
                        />
                        de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Siguiente
                    </Button>
                </div>
            </div>

            {/* Tabla de Resultados (Coincidiendo con UI original) */}
            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50 font-bold border-b transition-colors">
                                <TableHead className="font-bold text-foreground py-4">
                                    <button
                                        className="flex items-center gap-1 hover:text-gray-600 focus:outline-none"
                                        onClick={() => {
                                            if (sortBy === 'id') {
                                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                            } else {
                                                setSortBy('id');
                                                setSortOrder('asc');
                                            }
                                        }}
                                    >
                                        Identificador
                                        {sortBy === 'id' && (
                                            <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                        {sortBy !== 'id' && <span className="text-xs text-gray-300">▼</span>}
                                    </button>
                                </TableHead>
                                <TableHead className="font-bold text-foreground">Usuario</TableHead>
                                <TableHead className="font-bold text-foreground py-3">Cuenta</TableHead>
                                <TableHead className="font-bold text-foreground">Concepto</TableHead>
                                <TableHead className="font-bold text-foreground">Status</TableHead>
                                <TableHead className="font-bold text-foreground">Nro de aprobacion</TableHead>
                                <TableHead className="font-bold text-foreground">
                                    <button
                                        className="flex items-center gap-1 hover:text-gray-600 focus:outline-none"
                                        onClick={() => {
                                            if (sortBy === 'creado') {
                                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                            } else {
                                                setSortBy('creado');
                                                setSortOrder('asc');
                                            }
                                        }}
                                    >
                                        Fecha
                                        {sortBy === 'creado' && (
                                            <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                        {sortBy !== 'creado' && <span className="text-xs text-gray-300">▼</span>}
                                    </button>
                                </TableHead>
                                <TableHead className="font-bold text-foreground">Acciones</TableHead>
                                <TableHead className="text-right font-bold text-foreground py-3">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && movimientos.length === 0 ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                            ) : movimientos.length === 0 ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No se encontraron movimientos.</TableCell></TableRow>
                            ) : movimientos.map((move) => {
                                const ident = move.identificador || `ID-${move.id}`;
                                // Format user logic from image
                                const displayMonto = move.movimiento === 'egreso' ? -Math.abs(move.monto) : Math.abs(move.monto);
                                const nroAprobacion = move.vale || "";
                                const displayStatus = move.status === 'aprobado' || nroAprobacion ? "Aprobado" : "Pendiente";

                                return (
                                    <TableRow key={move._id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                                        <TableCell className="py-3">
                                            <Badge
                                                className={`${getIdentificadorColor(ident)} rounded border-none px-2 font-normal text-sm cursor-pointer hover:opacity-80 transition-opacity`}
                                                onClick={() => setSelectedViewMove(move)}
                                            >
                                                {ident}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-foreground">
                                            {move.usuario || move.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-foreground/80">
                                            {move.cuenta}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-sm text-foreground/80" title={move.concepto}>
                                            {move.concepto.toUpperCase()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusColor(displayStatus)} rounded border-none font-normal text-xs`}>
                                                {displayStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-foreground/80">
                                            {nroAprobacion}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-foreground/80">
                                            {(() => {
                                                try {
                                                    const dateVal = move.fecha ? new Date(move.fecha) : (move.creado ? new Date(move.creado) : null);
                                                    return dateVal && !isNaN(dateVal.getTime())
                                                        ? format(dateVal, "dd/MM/yy", { locale: es })
                                                        : (move.fechaString || "N/A");
                                                } catch (e) {
                                                    return move.fechaString || "N/A";
                                                }
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <RequirePermission perm="editarMovimientos">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleEditClick(move)}
                                                        className="h-[28px] w-[28px] p-0 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white rounded"
                                                    >
                                                        <Pen className="w-[14px] h-[14px]" />
                                                    </Button>
                                                </RequirePermission>
                                                <RequirePermission perm="eliminarMovimientos">
                                                    <Button
                                                        size="sm"
                                                        onClick={async () => {
                                                            if (window.confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
                                                                try {
                                                                    await api.delete(`/movimientos/${move._id}`);
                                                                    fetchMovimientos();
                                                                } catch (error) {
                                                                    console.error("Error al eliminar movimiento:", error);
                                                                    alert("Error al eliminar el movimiento.");
                                                                }
                                                            }
                                                        }}
                                                        className="h-[28px] w-[28px] p-0 bg-[#dc3545] hover:bg-[#bb2d3b] text-white rounded"
                                                    >
                                                        <Trash2 className="w-[14px] h-[14px]" />
                                                    </Button>
                                                </RequirePermission>
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-medium tracking-tight ${displayMonto < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                            {formatMoneda(displayMonto)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination Controls removed from bottom -> relocated to top */}

            {/* Detail / Appoval Modal */}
            <ViewMoveModal
                move={selectedViewMove}
                onClose={() => setSelectedViewMove(null)}
                onSuccess={() => {
                    setSelectedViewMove(null);
                    fetchMovimientos();
                }}
            />

            {/* Edit Modal (re-uses MoveModal) */}
            {isEditModalOpen && (
                <MoveModal
                    isOpen={isEditModalOpen}
                    move={moveToEdit}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setMoveToEdit(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setMoveToEdit(null);
                        fetchMovimientos();
                    }}
                />
            )}
        </div>
    );
}
