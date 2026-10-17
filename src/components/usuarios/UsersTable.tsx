"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Pencil, Trash2, Search, UserX, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import Swal from 'sweetalert2';
import RequirePermission from "@/components/auth/RequirePermission";
import { navigation } from "@/components/layout/navegacion";
import { tienePermiso } from "@/lib/permissions";
import UserModal from "./UserModal";
import { CLAVES_PERMISOS } from "./permisos/catalogo";

interface Usuario {
    _id: string;
    username: string;
    email: string;
    vendedor?: number;
    permissions?: Record<string, boolean>;
}

const COLOR_MARCA = '#a32240';

function iniciales(nombre: string) {
    const partes = nombre.trim().split(/[\s._-]+/).filter(Boolean);
    if (partes.length === 0) return "?";
    return (partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0].slice(0, 2)).toUpperCase();
}

function codigoVendedor(v?: number) {
    return v && v > 0 ? (v <= 9 ? `0${v}` : String(v)) : null;
}

/** Secciones del menú a las que entra el usuario (sin el Dashboard). */
function seccionesDe(u: Usuario) {
    return navigation.filter((item) => !item.general && item.perm && tienePermiso(u.permissions, item.perm));
}

export default function UsersTable() {
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/usuarios');
            if (res.data.success) {
                setUsers(res.data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            Swal.fire('Error', 'No se pudieron cargar los usuarios.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();

        const handleRefresh = () => loadUsers();
        window.addEventListener("refresh_usuarios", handleRefresh);
        return () => window.removeEventListener("refresh_usuarios", handleRefresh);
    }, []);

    const handleDelete = async (user: Usuario) => {
        const result = await Swal.fire({
            title: '¿Eliminar usuario?',
            text: `Se eliminará a ${user.username}. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await api.delete(`/usuarios/${user._id}`);
                if (res.data.success) {
                    Swal.fire({ title: 'Eliminado', text: 'Usuario eliminado con éxito', icon: 'success', confirmButtonColor: COLOR_MARCA });
                    setUsers(res.data.users); // Refresh the table automatically
                }
            } catch (error) {
                console.error("Delete Error:", error);
                Swal.fire('Error', 'Hubo un error al eliminar el usuario', 'error');
            }
        }
    };

    const handleEdit = (user: Usuario) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return users
            .filter((u) => !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
            .sort((a, b) => (a.username || "").localeCompare(b.username || "", "es", { sensitivity: "base" }));
    }, [users, busqueda]);

    if (loading) {
        return (
            <div className="divide-y divide-border" aria-busy="true" aria-label="Cargando usuarios">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-4">
                        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (users.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No hay usuarios registrados o no tienes permiso para verlos.</div>;
    }

    return (
        <div className="w-full">
            {/* Buscador y conteo */}
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre o correo"
                        aria-label="Buscar usuarios"
                        className="h-9 pl-9"
                    />
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                    {visibles.length === users.length
                        ? `${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`
                        : `${visibles.length} de ${users.length} usuarios`}
                </p>
            </div>

            {visibles.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    Ningún usuario coincide con “{busqueda}”.
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {/* Encabezados (solo en pantallas medianas o más) */}
                    <li className="hidden md:grid grid-cols-[minmax(0,2.2fr)_90px_minmax(0,2fr)_88px] items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" aria-hidden="true">
                        <span>Usuario</span>
                        <span>Vendedor</span>
                        <span>Acceso</span>
                        <span className="text-right">Acciones</span>
                    </li>
                    {visibles.map((user) => {
                        const activos = CLAVES_PERMISOS.filter((k) => user.permissions?.[k] === true).length;
                        const secciones = seccionesDe(user);
                        const esAdmin = user.username === "admin" || activos === CLAVES_PERMISOS.length;
                        const codigo = codigoVendedor(user.vendedor);

                        return (
                            <li
                                key={user._id}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-3.5 transition-colors hover:bg-muted md:grid-cols-[minmax(0,2.2fr)_90px_minmax(0,2fr)_88px]"
                            >
                                {/* Usuario */}
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        aria-hidden="true"
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:text-red-400"
                                    >
                                        {iniciales(user.username || "")}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <span className="truncate font-semibold text-foreground">{user.username}</span>
                                            {esAdmin && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-px text-[11px] font-medium text-muted-foreground">
                                                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                                                    Administrador
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>

                                {/* Acciones (en celular quedan a la derecha del usuario) */}
                                <div className="flex items-center justify-end gap-1 md:order-last">
                                    <RequirePermission perm="modificarUsuarios">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(user)}
                                            aria-label={`Editar a ${user.username}`}
                                            title="Editar usuario y permisos"
                                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <Pencil className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </RequirePermission>
                                    <RequirePermission perm="eliminarUsuarios">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(user)}
                                            aria-label={`Eliminar a ${user.username}`}
                                            title="Eliminar usuario"
                                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </RequirePermission>
                                </div>

                                {/* Vendedor */}
                                <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                                    <span className="text-xs text-muted-foreground md:hidden">Vendedor</span>
                                    {codigo ? (
                                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-xs tabular-nums text-foreground">{codigo}</span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </div>

                                {/* Acceso: secciones del menú que ve + total de permisos */}
                                <div className="col-span-2 min-w-0 md:col-span-1">
                                    {secciones.length === 0 ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                                            Sin acceso a secciones
                                        </span>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <ul className="flex flex-wrap gap-1" aria-label={`Secciones de ${user.username}`}>
                                                {secciones.map((s) => {
                                                    const Icono = s.icon;
                                                    return (
                                                        <li
                                                            key={s.href}
                                                            title={s.name}
                                                            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground"
                                                        >
                                                            <Icono className="h-3.5 w-3.5" aria-hidden="true" />
                                                            <span className="sr-only">{s.name}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                {activos} de {CLAVES_PERMISOS.length} permisos
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Injected Edit Modal */}
            <UserModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                    window.dispatchEvent(new Event("refresh_usuarios"));
                }}
                userToEdit={selectedUser}
            />

        </div>
    );
}
