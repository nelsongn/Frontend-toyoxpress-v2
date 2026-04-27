"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from 'sweetalert2';
import RequirePermission from "@/components/auth/RequirePermission";
import UserModal from "./UserModal";

export default function UsersTable() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

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

    const handleDelete = async (user: any) => {
        const result = await Swal.fire({
            title: '¿Confirmar Eliminación?',
            text: `¿Estás seguro que deseas eliminar al usuario ${user.username}? Esta acción es irreversible.`,
            icon: 'error',
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
                    Swal.fire('Eliminado', 'Usuario eliminado con éxito', 'success');
                    setUsers(res.data.users); // Refresh the table automatically
                }
            } catch (error) {
                console.error("Delete Error:", error);
                Swal.fire('Error', 'Hubo un error al eliminar el usuario', 'error');
            }
        }
    };

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando Usuarios...</div>;
    }

    if (users.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No hay usuarios registrados o no tienes permiso para verlos.</div>;
    }

    return (
        <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border">
                    <tr>
                        <th className="px-6 py-4 font-medium">Nombre de Usuario</th>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium text-center">Cód. Vendedor</th>
                        <th className="px-6 py-4 font-medium text-center">Permisos Asignados</th>
                        <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {users.map((user) => {
                        const activePermsCount = Object.values(user.permissions || {}).filter(val => val === true).length;
                        return (
                            <tr key={user._id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4 font-medium text-foreground">{user.username}</td>
                                <td className="px-6 py-4 text-foreground">{user.email}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-mono text-muted-foreground">
                                        {user.vendedor > 0 ? (user.vendedor <= 9 ? `0${user.vendedor}` : user.vendedor) : '--'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-blue-700">
                                        {activePermsCount} activos
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <RequirePermission perm="modificarUsuarios">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                title="Editar Usuario"
                                                onClick={() => handleEdit(user)}
                                            >
                                                <Edit className="h-4 w-4 text-blue-600" />
                                            </Button>
                                        </RequirePermission>
                                        <RequirePermission perm="eliminarUsuarios">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                title="Eliminar Usuario"
                                                className="hover:bg-red-50 hover:border-red-200"
                                                onClick={() => handleDelete(user)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </RequirePermission>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

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
