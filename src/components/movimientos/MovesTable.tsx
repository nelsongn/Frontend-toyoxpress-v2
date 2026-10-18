"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X, Search, SlidersHorizontal, MoreVertical, Eye, Pencil, Trash2, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import Swal from "sweetalert2";
import ViewMoveModal from "./ViewMoveModal";
import MoveModal from "./MoveModal";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { tienePermiso } from "@/lib/permissions";
import {
    type Movimiento, type AtajoFecha, ETIQUETA_ATAJO, esAprobado, fechaDe, formatoMonto,
    identificadorDe, montoConSigno, rangoAtajo,
} from "./reglas";

interface Cuenta { _id?: string; value: string; label: string }
interface Resumen {
    saldoAprobado: number | null;
    cajaChica: number | null;
    pendientes: { cantidad: number; monto: number } | null;
}
type Estado = "no_verificados" | "verificados" | "todos";

const COLOR_MARCA = "#a32240";
const ATAJO_INICIAL: AtajoFecha = "3meses";

const filtrosIniciales = () => {
    const { inicio, cierre } = rangoAtajo(ATAJO_INICIAL);
    return {
        buscar: "",
        movimiento: "" as "" | "ingreso" | "egreso",
        cuenta: [] as string[],
        usuario: "",
        tipoPago: "",
        fechaInicio: inicio,
        fechaCierre: cierre,
    };
};

const ESTADOS: { valor: Estado; texto: string }[] = [
    { valor: "no_verificados", texto: "No verificados" },
    { valor: "verificados", texto: "Verificados" },
    { valor: "todos", texto: "Todos" },
];

const TIPOS_PAGO: Record<string, string> = { bs: "Bolívares", zelle: "Zelle", efectivo: "Efectivo", otro: "Otro" };

// Pill de estado: ámbar = pendiente (el rojo queda para errores)
function EstadoPill({ aprobado }: { aprobado: boolean }) {
    return (
        <span
            className={cn(
                "inline-block whitespace-nowrap rounded-full border px-2 py-px text-[11px] font-medium",
                aprobado ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-amber-500 text-amber-600 dark:text-amber-400"
            )}
        >
            {aprobado ? "Aprobado" : "Pendiente"}
        </span>
    );
}

function Monto({ m, className }: { m: Movimiento; className?: string }) {
    const valor = montoConSigno(m);
    return (
        <span className={cn("font-mono font-semibold tabular-nums", valor < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400", className)}>
            {formatoMonto(valor, true)}
        </span>
    );
}

export default function MovesTable() {
    const permissions = useAuthStore((state) => state.permissions);
    const puedeAprobar = tienePermiso(permissions, "aprobarMovimientos");
    const puedeEditar = tienePermiso(permissions, "editarMovimientos");
    const puedeEliminar = tienePermiso(permissions, "eliminarMovimientos");

    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [resumen, setResumen] = useState<Resumen>({ saldoAprobado: null, cajaChica: null, pendientes: null });

    // Paginación y orden
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState<"id" | "creado">("id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // Filtros
    const [estado, setEstado] = useState<Estado>("no_verificados");
    const [filters, setFilters] = useState(filtrosIniciales);
    const [buscarTexto, setBuscarTexto] = useState("");
    const [masFiltros, setMasFiltros] = useState(false);
    const [fechasPersonalizadas, setFechasPersonalizadas] = useState(false);

    // Modales
    const [detalle, setDetalle] = useState<{ move: Movimiento; aprobar: boolean } | null>(null);
    const [moveToEdit, setMoveToEdit] = useState<Movimiento | null>(null);
    const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

    // Datos de los combos
    const [usuariosDB, setUsuariosDB] = useState<string[]>([]);
    const [cuentasDB, setCuentasDB] = useState<Cuenta[]>([]);
    const [openUserSelect, setOpenUserSelect] = useState(false);
    const [openCuentaSelect, setOpenCuentaSelect] = useState(false);

    // El buscador aplica 400 ms después de dejar de escribir
    useEffect(() => {
        const id = setTimeout(() => setFilters((f) => (f.buscar === buscarTexto ? f : { ...f, buscar: buscarTexto })), 400);
        return () => clearTimeout(id);
    }, [buscarTexto]);

    const fetchMovimientos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append("page", String(page));
            params.append("limit", String(limit));
            params.append("sortBy", sortBy);
            params.append("sortOrder", sortOrder);
            params.append("status", estado);
            if (filters.buscar) params.append("buscar", filters.buscar);
            if (filters.movimiento) params.append("movimiento", filters.movimiento);
            if (filters.cuenta.length > 0) params.append("cuenta", filters.cuenta.join(","));
            if (filters.usuario) params.append("usuario", filters.usuario);
            if (filters.tipoPago) params.append("tipoPago", filters.tipoPago);
            if (filters.fechaInicio) params.append("fechaInicio", filters.fechaInicio);
            if (filters.fechaCierre) params.append("fechaCierre", filters.fechaCierre);

            const res = await api.get(`/movimientos?${params.toString()}`);
            if (res.data.success) {
                setMovimientos(res.data.movimientos || []);
                setTotal(res.data.total || 0);
                setTotalPages(res.data.totalPages || Math.ceil((res.data.total || 0) / limit) || 1);
                // Resumen con significado fijo (backend nuevo). Si no viene, no se muestran las tarjetas.
                setResumen({
                    saldoAprobado: typeof res.data.saldo_aprobado === "number" ? res.data.saldo_aprobado : null,
                    cajaChica: typeof res.data.caja_chica_aprobada === "number" ? res.data.caja_chica_aprobada : null,
                    pendientes: res.data.pendientes ?? null,
                });
            }
        } catch (error) {
            console.error("Error fetching movimientos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const id = setTimeout(() => fetchMovimientos(), 150);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, estado, page, limit, sortBy, sortOrder]);

    // Volver a la página 1 cuando cambian los filtros o la pestaña
    useEffect(() => { setPage(1); }, [filters, estado]);

    useEffect(() => {
        const cargar = async () => {
            try {
                const [resUsers, resCuentas] = await Promise.all([api.get("/movimientos/usuarios"), api.get("/cuentas")]);
                if (resUsers.data.success) setUsuariosDB(resUsers.data.usuarios || []);
                if (resCuentas.data.success) setCuentasDB(resCuentas.data.cuentas || []);
            } catch (error) {
                console.error("Error fetching filter data:", error);
            }
        };
        cargar();
    }, []);

    // Recarga desde fuera (p. ej. al crear un movimiento en la página)
    const fetchRef = useRef(fetchMovimientos);
    useEffect(() => { fetchRef.current = fetchMovimientos; });
    useEffect(() => {
        const recargar = () => fetchRef.current();
        window.addEventListener("refresh_movimientos", recargar);
        return () => window.removeEventListener("refresh_movimientos", recargar);
    }, []);

    const atajoActivo = useMemo<AtajoFecha | null>(() => {
        for (const a of Object.keys(ETIQUETA_ATAJO) as AtajoFecha[]) {
            const r = rangoAtajo(a);
            if (r.inicio === filters.fechaInicio && r.cierre === filters.fechaCierre) return a;
        }
        return null;
    }, [filters.fechaInicio, filters.fechaCierre]);

    const aplicarAtajo = (a: AtajoFecha) => {
        const r = rangoAtajo(a);
        setFechasPersonalizadas(false);
        setFilters((f) => ({ ...f, fechaInicio: r.inicio, fechaCierre: r.cierre }));
    };

    const nombreCuenta = (v: string) => cuentasDB.find((c) => c.value === v)?.label || v;

    // Filtros activos como etiquetas con ✕ (las fechas se muestran aparte)
    const chips: { clave: string; texto: string; quitar: () => void }[] = [];
    if (filters.buscar) chips.push({ clave: "buscar", texto: `“${filters.buscar}”`, quitar: () => { setBuscarTexto(""); setFilters((f) => ({ ...f, buscar: "" })); } });
    if (filters.movimiento) chips.push({ clave: "tipo", texto: filters.movimiento === "ingreso" ? "Ingresos" : "Egresos", quitar: () => setFilters((f) => ({ ...f, movimiento: "" })) });
    filters.cuenta.forEach((c) => chips.push({ clave: `cuenta-${c}`, texto: `Cuenta: ${nombreCuenta(c)}`, quitar: () => setFilters((f) => ({ ...f, cuenta: f.cuenta.filter((x) => x !== c) })) }));
    if (filters.usuario) chips.push({ clave: "usuario", texto: `Usuario: ${filters.usuario}`, quitar: () => setFilters((f) => ({ ...f, usuario: "" })) });
    if (filters.tipoPago) chips.push({ clave: "pago", texto: `Pago: ${TIPOS_PAGO[filters.tipoPago] || filters.tipoPago}`, quitar: () => setFilters((f) => ({ ...f, tipoPago: "" })) });
    const hayFiltros = chips.length > 0 || atajoActivo !== ATAJO_INICIAL;

    const limpiarFiltros = () => {
        setBuscarTexto("");
        setFechasPersonalizadas(false);
        setFilters(filtrosIniciales());
    };

    const alternarOrden = (campo: "id" | "creado") => {
        if (sortBy === campo) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        else { setSortBy(campo); setSortOrder("desc"); }
    };

    const eliminar = async (m: Movimiento) => {
        setMenuAbierto(null);
        const r = await Swal.fire({
            title: "¿Eliminar movimiento?",
            text: `Se eliminará ${identificadorDe(m)} (${m.concepto || "sin concepto"}).`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        try {
            await api.delete(`/movimientos/${m._id}`);
            fetchMovimientos();
        } catch (error) {
            console.error("Error al eliminar movimiento:", error);
            Swal.fire({ title: "Error", text: "No se pudo eliminar el movimiento.", icon: "error", confirmButtonColor: COLOR_MARCA });
        }
    };

    // Menú ⋮ de cada movimiento
    // "lugar" separa el menú de la tabla y el de las tarjetas (ambos existen en el DOM)
    const MenuAcciones = ({ m, lugar }: { m: Movimiento; lugar: "tabla" | "tarjeta" }) => (
        <Popover open={menuAbierto === `${lugar}-${m._id}`} onOpenChange={(o) => setMenuAbierto(o ? `${lugar}-${m._id}` : null)}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Acciones de ${identificadorDe(m)}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => { setMenuAbierto(null); setDetalle({ move: m, aprobar: false }); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                    <Eye className="h-4 w-4" aria-hidden="true" /> Ver
                </button>
                {puedeEditar && (
                    <button type="button" onClick={() => { setMenuAbierto(null); setMoveToEdit(m); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                        <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
                    </button>
                )}
                {puedeEliminar && (
                    <button type="button" onClick={() => eliminar(m)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400">
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );

    const BotonAprobar = ({ m }: { m: Movimiento }) =>
        puedeAprobar && !esAprobado(m) ? (
            <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={(e) => { e.stopPropagation(); setDetalle({ move: m, aprobar: true }); }}
            >
                Aprobar
            </Button>
        ) : null;

    const pendientes = resumen.pendientes;

    return (
        <div className="space-y-4">
            {/* Resumen: significado fijo, no depende de la pestaña ni de las fechas */}
            {(resumen.saldoAprobado !== null || resumen.cajaChica !== null || pendientes) && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {resumen.saldoAprobado !== null && (
                        <section aria-label="Saldo aprobado" className="rounded-lg border border-border bg-card p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo aprobado</p>
                            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{formatoMonto(resumen.saldoAprobado)}</p>
                            <p className="text-xs text-muted-foreground">Movimientos aprobados · todas las fechas{filters.cuenta.length > 0 ? " · cuentas filtradas" : ""}</p>
                        </section>
                    )}
                    {resumen.cajaChica !== null && (
                        <section aria-label="Caja chica" className="rounded-lg border border-border bg-card p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Caja chica</p>
                            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{formatoMonto(resumen.cajaChica)}</p>
                            <p className="text-xs text-muted-foreground">Saldo de la cuenta CajaChica</p>
                        </section>
                    )}
                    {pendientes && (
                        <section aria-label="Pendiente por aprobar" className="rounded-lg border border-border border-l-4 border-l-amber-500 bg-card p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pendiente por aprobar</p>
                            <div className="mt-1 flex items-baseline justify-between gap-3">
                                <p className="font-mono text-2xl font-semibold tabular-nums">{formatoMonto(pendientes.monto)}</p>
                                {pendientes.cantidad > 0 && estado !== "no_verificados" && (
                                    <button type="button" onClick={() => setEstado("no_verificados")} className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">
                                        Ver <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {pendientes.cantidad === 0 ? "Nada pendiente" : `${pendientes.cantidad} ${pendientes.cantidad === 1 ? "movimiento" : "movimientos"} sin aprobar`}
                            </p>
                        </section>
                    )}
                </div>
            )}

            {/* Filtros */}
            <section aria-label="Filtros" className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                            type="search"
                            value={buscarTexto}
                            onChange={(e) => setBuscarTexto(e.target.value)}
                            placeholder="Buscar concepto, identificador o nro de aprobación"
                            aria-label="Buscar movimientos"
                            className="h-9 pl-9"
                        />
                    </div>

                    <Select value={filters.movimiento || "todos"} onValueChange={(v) => setFilters((f) => ({ ...f, movimiento: v === "todos" ? "" : (v as "ingreso" | "egreso") }))}>
                        <SelectTrigger className="h-9 w-full sm:w-[180px]" aria-label="Tipo de movimiento">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Ingresos y egresos</SelectItem>
                            <SelectItem value="ingreso">Solo ingresos</SelectItem>
                            <SelectItem value="egreso">Solo egresos</SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover open={openCuentaSelect} onOpenChange={setOpenCuentaSelect}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCuentaSelect} className="h-9 w-full justify-between sm:w-[160px] px-3 font-normal">
                                <span className="truncate">
                                    {filters.cuenta.length === 0 ? "Todas las cuentas" : filters.cuenta.length === 1 ? nombreCuenta(filters.cuenta[0]) : `${filters.cuenta.length} cuentas`}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar cuenta..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró la cuenta.</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-y-auto">
                                        {cuentasDB.map((c) => {
                                            const marcada = filters.cuenta.includes(c.value);
                                            return (
                                                <CommandItem
                                                    key={c._id || c.value}
                                                    value={c.label}
                                                    onSelect={() => setFilters((f) => ({ ...f, cuenta: marcada ? f.cuenta.filter((x) => x !== c.value) : [...f.cuenta, c.value] }))}
                                                >
                                                    <span className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", marcada ? "bg-primary text-primary-foreground" : "[&_svg]:invisible")}>
                                                        <Check className="h-3.5 w-3.5" />
                                                    </span>
                                                    {c.label}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openUserSelect} className="h-9 w-full justify-between sm:w-[180px] px-3 font-normal">
                                <span className="truncate">{filters.usuario || "Todos los usuarios"}</span>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar usuario..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró el usuario.</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-y-auto">
                                        <CommandItem value="__todos__" onSelect={() => { setFilters((f) => ({ ...f, usuario: "" })); setOpenUserSelect(false); }}>
                                            Todos los usuarios
                                        </CommandItem>
                                        {usuariosDB.map((u) => (
                                            <CommandItem key={u} value={u} onSelect={() => { setFilters((f) => ({ ...f, usuario: f.usuario === u ? "" : u })); setOpenUserSelect(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", filters.usuario === u ? "opacity-100" : "opacity-0")} />
                                                {u}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Button variant="outline" className="h-9 w-full gap-2 sm:w-auto" onClick={() => setMasFiltros((v) => !v)} aria-expanded={masFiltros}>
                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                        Más filtros
                    </Button>
                </div>

                {masFiltros && (
                    <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                        <label className="space-y-1">
                            <span className="block text-xs font-medium text-muted-foreground">Tipo de pago</span>
                            <Select value={filters.tipoPago || "todos"} onValueChange={(v) => setFilters((f) => ({ ...f, tipoPago: v === "todos" ? "" : v }))}>
                                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Cualquiera</SelectItem>
                                    {Object.entries(TIPOS_PAGO).map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </label>
                    </div>
                )}

                {/* Fechas: atajos o rango personalizado */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-muted-foreground">Fechas:</span>
                    {(Object.keys(ETIQUETA_ATAJO) as AtajoFecha[]).map((a) => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => aplicarAtajo(a)}
                            aria-pressed={atajoActivo === a && !fechasPersonalizadas}
                            className={cn(
                                "rounded-full border px-3 py-0.5 text-xs transition-colors",
                                atajoActivo === a && !fechasPersonalizadas ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {ETIQUETA_ATAJO[a]}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setFechasPersonalizadas(true)}
                        aria-pressed={fechasPersonalizadas || atajoActivo === null}
                        className={cn(
                            "rounded-full border px-3 py-0.5 text-xs transition-colors",
                            fechasPersonalizadas || atajoActivo === null ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Personalizado
                    </button>
                    {(fechasPersonalizadas || atajoActivo === null) && (
                        <span className="flex flex-wrap items-center gap-1.5">
                            <Input type="date" value={filters.fechaInicio} max={filters.fechaCierre} onChange={(e) => setFilters((f) => ({ ...f, fechaInicio: e.target.value }))} aria-label="Desde" className="h-8 w-[150px]" />
                            <span className="text-xs text-muted-foreground">a</span>
                            <Input type="date" value={filters.fechaCierre} min={filters.fechaInicio} onChange={(e) => setFilters((f) => ({ ...f, fechaCierre: e.target.value }))} aria-label="Hasta" className="h-8 w-[150px]" />
                        </span>
                    )}
                </div>

                {hayFiltros && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                        {chips.map((c) => (
                            <span key={c.clave} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pl-2.5 pr-1 text-xs">
                                {c.texto}
                                <button type="button" onClick={c.quitar} aria-label={`Quitar filtro ${c.texto}`} className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                            </span>
                        ))}
                        <button type="button" onClick={limpiarFiltros} className="ml-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </section>

            {/* Resultados */}
            <section aria-label="Movimientos" className="rounded-lg border border-border bg-card shadow-sm">
                <div role="tablist" aria-label="Estado de los movimientos" className="flex gap-5 overflow-x-auto border-b border-border px-4">
                    {ESTADOS.map((e) => (
                        <button
                            key={e.valor}
                            type="button"
                            role="tab"
                            aria-selected={estado === e.valor}
                            onClick={() => setEstado(e.valor)}
                            className={cn(
                                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-sm transition-colors",
                                estado === e.valor ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {e.texto}
                            {e.valor === "no_verificados" && pendientes && pendientes.cantidad > 0 && (
                                <span className="rounded-full border border-amber-500 px-1.5 text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400">{pendientes.cantidad}</span>
                            )}
                        </button>
                    ))}
                </div>

                {loading && movimientos.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">Cargando movimientos…</p>
                ) : movimientos.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                        No hay movimientos con estos filtros.
                        {hayFiltros && <> <button type="button" onClick={limpiarFiltros} className="font-medium text-foreground underline-offset-4 hover:underline">Limpiar filtros</button></>}
                    </p>
                ) : (
                    <>
                        {/* Escritorio: tabla */}
                        <div className={cn("hidden overflow-x-auto md:block", loading && "opacity-60")}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-2.5">
                                            <button type="button" onClick={() => alternarOrden("id")} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                                                ID {sortBy === "id" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-4 py-2.5">Usuario</th>
                                        <th className="px-4 py-2.5">Cuenta</th>
                                        <th className="px-4 py-2.5">
                                            <button type="button" onClick={() => alternarOrden("creado")} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                                                Concepto · fecha {sortBy === "creado" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-4 py-2.5">Estado</th>
                                        <th className="px-4 py-2.5 text-right">Monto</th>
                                        <th className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border border-t border-border">
                                    {movimientos.map((m) => (
                                        <tr
                                            key={m._id}
                                            onClick={() => setDetalle({ move: m, aprobar: false })}
                                            className="cursor-pointer transition-colors hover:bg-secondary"
                                        >
                                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">{identificadorDe(m)}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5">{m.usuario || m.name}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{m.cuenta}</td>
                                            <td className="max-w-[340px] px-4 py-2.5">
                                                <p className="truncate font-medium" title={m.concepto}>{(m.concepto || "").toUpperCase()}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {fechaDe(m)} · {m.vale ? `aprobación ${m.vale}` : m.cuenta === "CajaChica" ? "caja chica" : "sin nro de aprobación"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5"><EstadoPill aprobado={esAprobado(m)} /></td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-right"><Monto m={m} /></td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <BotonAprobar m={m} />
                                                    <MenuAcciones m={m} lugar="tabla" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Celular: tarjetas */}
                        <ul className={cn("divide-y divide-border md:hidden", loading && "opacity-60")}>
                            {movimientos.map((m) => (
                                <li key={m._id} onClick={() => setDetalle({ move: m, aprobar: false })} className="cursor-pointer px-4 py-3 active:bg-secondary">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">{identificadorDe(m)}</span>
                                        <EstadoPill aprobado={esAprobado(m)} />
                                    </div>
                                    <p className="mt-1 truncate text-sm font-medium">{(m.concepto || "").toUpperCase()}</p>
                                    <div className="mt-0.5 flex items-baseline justify-between gap-2">
                                        <span className="truncate text-xs text-muted-foreground">{m.cuenta} · {fechaDe(m)} · {m.usuario || m.name}</span>
                                        <Monto m={m} className="text-sm" />
                                    </div>
                                    {(puedeAprobar && !esAprobado(m)) || puedeEditar || puedeEliminar ? (
                                        <div className="mt-2 flex items-center justify-end gap-1">
                                            <BotonAprobar m={m} />
                                            <MenuAcciones m={m} lugar="tarjeta" />
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {/* Paginación */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span>Mostrar</span>
                        <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                            <SelectTrigger className="h-8 w-[72px]" aria-label="Movimientos por página"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="tabular-nums">· {total} {total === 1 ? "movimiento" : "movimientos"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</Button>
                        <span className="tabular-nums">Página {page} de {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Siguiente</Button>
                    </div>
                </div>
            </section>

            {/* Detalle / aprobación */}
            <ViewMoveModal
                move={detalle?.move ?? null}
                enfocarAprobacion={detalle?.aprobar}
                onClose={() => setDetalle(null)}
                onSuccess={() => { setDetalle(null); fetchMovimientos(); }}
            />

            {/* Edición (reutiliza MoveModal) */}
            {moveToEdit && (
                <MoveModal
                    isOpen={!!moveToEdit}
                    onClose={() => setMoveToEdit(null)}
                    onSuccess={() => { setMoveToEdit(null); fetchMovimientos(); }}
                    move={moveToEdit}
                />
            )}
        </div>
    );
}
