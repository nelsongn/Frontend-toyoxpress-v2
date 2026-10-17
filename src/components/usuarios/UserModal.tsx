import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import Swal from 'sweetalert2';
import { MODULOS_PERMISOS, permisosDesde, permisosVacios, type MapaPermisos } from "./permisos/catalogo";
import { ModuloPermisosCard } from "./permisos/ModuloPermisosCard";
import { VistaPreviaMenu } from "./permisos/VistaPreviaMenu";

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: any | null;
}

const COLOR_MARCA = '#a32240';

function iniciales(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio) return "?";
    const partes = limpio.split(/[\s._-]+/).filter(Boolean);
    return (partes.length > 1 ? partes[0][0] + partes[1][0] : limpio.slice(0, 2)).toUpperCase();
}

export default function UserModal({ isOpen, onClose, onSuccess, userToEdit }: UserModalProps) {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        vendedor: 0,
        permissions: permisosVacios() as MapaPermisos,
    });

    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                setFormData({
                    username: userToEdit.username || "",
                    email: userToEdit.email || "",
                    password: "", // Leave blank on edit unless they want to change it
                    vendedor: userToEdit.vendedor || 0,
                    // Ensure permissions object doesn't crash if malformed in DB
                    permissions: permisosDesde(userToEdit.permissions),
                });
            } else {
                setFormData({
                    username: "",
                    email: "",
                    password: "",
                    vendedor: 0,
                    permissions: permisosVacios(),
                });
            }
        }
    }, [isOpen, userToEdit]);

    const handlePermissionChange = (perm: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [perm]: checked
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            username: formData.username,
            email: formData.email,
            permissions: formData.permissions,
            vendedor: formData.vendedor || 0,
            ...(formData.password && { password: formData.password }) // Only include password if typed
        };

        try {
            if (userToEdit && userToEdit._id) {
                const result = await Swal.fire({
                    title: '¿Confirmar Edición?',
                    text: 'Se actualizarán los datos y permisos de este usuario.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: COLOR_MARCA,
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText: 'Cancelar',
                    target: document.getElementById('user-modal-content')
                });

                if (result.isConfirmed) {
                    await api.put(`/usuarios/${userToEdit._id}`, payload);
                    Swal.fire({ title: '¡Guardado!', text: 'Usuario actualizado.', icon: 'success', timer: 2000, showConfirmButton: false, target: document.getElementById('user-modal-content') });
                    onSuccess();
                }
            } else {
                await api.post("/usuarios", payload);
                Swal.fire({ title: '¡Creado!', text: 'Usuario registrado exitosamente.', icon: 'success', timer: 2000, showConfirmButton: false, target: document.getElementById('user-modal-content') });
                onSuccess();
            }
        } catch (error: any) {
            console.error("Error saving user", error);
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.message || 'No se pudo guardar el usuario.',
                icon: 'error',
                target: document.getElementById('user-modal-content')
            });
        } finally {
            setLoading(false);
        }
    };

    const totalActivos = Object.values(formData.permissions).filter(Boolean).length;
    const subtitulo = userToEdit
        ? [formData.email, formData.vendedor ? `vendedor ${formData.vendedor}` : null].filter(Boolean).join(" · ")
        : "Completa los datos y elige qué secciones podrá usar.";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent id="user-modal-content" className="sm:max-w-[960px] p-0 gap-0 overflow-hidden bg-background max-h-[92vh] flex flex-col">
                <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-6 py-4 text-left">
                    <div
                        aria-hidden="true"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary dark:text-red-400"
                    >
                        {iniciales(formData.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <DialogTitle className="text-lg truncate">
                            {userToEdit ? `Editar usuario · ${formData.username || userToEdit.username}` : 'Nuevo usuario'}
                        </DialogTitle>
                        <DialogDescription className="truncate">{subtitulo}</DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* Datos del usuario */}
                        <section aria-labelledby="datos-usuario" className="space-y-3">
                            <h3 id="datos-usuario" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Datos del usuario
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="user-username">Nombre de usuario</Label>
                                    <Input
                                        id="user-username"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="admin_miguel"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="user-email">Correo electrónico</Label>
                                    <Input
                                        id="user-email"
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="correo@ejemplo.com"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="user-password">
                                        Contraseña {userToEdit && <span className="font-normal text-muted-foreground">(déjala vacía para no cambiarla)</span>}
                                    </Label>
                                    <Input
                                        id="user-password"
                                        required={!userToEdit} // Required only on creation
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={userToEdit ? "••••••••" : "Mínimo 6 caracteres"}
                                        className="h-10"
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="user-vendedor">Código de vendedor</Label>
                                    <Input
                                        id="user-vendedor"
                                        type="number"
                                        value={formData.vendedor || ""}
                                        onChange={(e) => setFormData({ ...formData, vendedor: parseInt(e.target.value) || 0 })}
                                        placeholder="Sin código"
                                        className="h-10"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Permisos: módulos en el orden del menú + vista previa del menú resultante */}
                        <section aria-labelledby="permisos-usuario" className="space-y-3">
                            <div className="flex items-baseline justify-between gap-3">
                                <h3 id="permisos-usuario" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Permisos
                                </h3>
                                <span className="text-xs tabular-nums text-muted-foreground">
                                    {totalActivos} {totalActivos === 1 ? "permiso activo" : "permisos activos"}
                                </span>
                            </div>
                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
                                <div className="space-y-3">
                                    {MODULOS_PERMISOS.map((modulo) => (
                                        <ModuloPermisosCard
                                            key={modulo.id}
                                            modulo={modulo}
                                            permisos={formData.permissions}
                                            onChange={handlePermissionChange}
                                        />
                                    ))}
                                </div>
                                {/* Fija mientras se recorren los módulos; con scroll propio si no cabe (pantallas bajas) */}
                                <div className="md:sticky md:top-0 md:max-h-[calc(92vh-13rem)] md:overflow-y-auto">
                                    <VistaPreviaMenu permisos={formData.permissions} username={formData.username} />
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Footer / Actions */}
                    <div className="px-6 py-4 bg-card border-t border-border flex justify-end gap-3 mt-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (userToEdit ? "Guardando..." : "Creando...") : (userToEdit ? "Guardar cambios" : "Crear usuario")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
