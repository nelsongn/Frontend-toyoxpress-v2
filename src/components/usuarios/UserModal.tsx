import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import Swal from 'sweetalert2';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: any | null;
}

export default function UserModal({ isOpen, onClose, onSuccess, userToEdit }: UserModalProps) {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        vendedor: 0,
        permissions: {
            verMovimientos: false,
            verOtrosMovimientos: false,
            aprobarMovimientos: false,
            editarMovimientos: false,
            eliminarMovimientos: false,
            modificarFechas: false,
            crearUsuarios: false,
            modificarUsuarios: false,
            eliminarUsuarios: false,
            horasIngreso: false,
            obviarIngreso: false,
            configurarCuentas: false,
            consultarPrecios: false,
            verClientes: false,
            verExcel: false,
            cargarProductos: false,
            verPedidos: false
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                // Ensure permissions object doesn't crash if malformed in DB
                const perms = userToEdit.permissions || {};
                setFormData({
                    username: userToEdit.username || "",
                    email: userToEdit.email || "",
                    password: "", // Leave blank on edit unless they want to change it
                    vendedor: userToEdit.vendedor || 0,
                    permissions: {
                        verMovimientos: !!perms.verMovimientos,
                        verOtrosMovimientos: !!perms.verOtrosMovimientos,
                        aprobarMovimientos: !!perms.aprobarMovimientos,
                        editarMovimientos: !!perms.editarMovimientos,
                        eliminarMovimientos: !!perms.eliminarMovimientos,
                        modificarFechas: !!perms.modificarFechas,
                        crearUsuarios: !!perms.crearUsuarios,
                        modificarUsuarios: !!perms.modificarUsuarios,
                        eliminarUsuarios: !!perms.eliminarUsuarios,
                        horasIngreso: !!perms.horasIngreso,
                        obviarIngreso: !!perms.obviarIngreso,
                        configurarCuentas: !!perms.configurarCuentas,
                        consultarPrecios: !!perms.consultarPrecios,
                        verClientes: !!perms.verClientes,
                        verExcel: !!perms.verExcel,
                        cargarProductos: !!perms.cargarProductos,
                        verPedidos: !!perms.verPedidos
                    }
                });
            } else {
                setFormData({
                    username: "",
                    email: "",
                    password: "",
                    vendedor: 0,
                    permissions: {
                        verMovimientos: false,
                        verOtrosMovimientos: false,
                        aprobarMovimientos: false,
                        editarMovimientos: false,
                        eliminarMovimientos: false,
                        modificarFechas: false,
                        crearUsuarios: false,
                        modificarUsuarios: false,
                        eliminarUsuarios: false,
                        horasIngreso: false,
                        obviarIngreso: false,
                        configurarCuentas: false,
                        consultarPrecios: false,
                        verClientes: false,
                        verExcel: false,
                        cargarProductos: false,
                        verPedidos: false
                    }
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
                    confirmButtonColor: '#0b5ed7',
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

    const permissionLabels: { [key: string]: string } = {
        verMovimientos: "Ver Movimientos (Global)",
        verOtrosMovimientos: "Ver Movimientos de Otros",
        aprobarMovimientos: "Aprobar Movimientos (Vales)",
        editarMovimientos: "Editar Movimientos",
        eliminarMovimientos: "Eliminar Movimientos",
        modificarFechas: "Modificar Fechas (Históricas)",
        crearUsuarios: "Crear Usuarios",
        modificarUsuarios: "Modificar Usuarios (Roles)",
        eliminarUsuarios: "Eliminar Usuarios",
        horasIngreso: "Ver/Configurar Horas de Ingreso",
        obviarIngreso: "Obviar Restricción de Horario",
        configurarCuentas: "Configurar Cuentas (Bancos)",
        consultarPrecios: "Consultar Precios",
        verClientes: "Ver Todos Los Clientes",
        verExcel: "Exportar a Excel",
        cargarProductos: "Cargar Productos (WooCommerce)",
        verPedidos: "Ver Pestaña de Pedidos"
    };

    const permissionCategories = [
        {
            title: "Módulo de Movimientos",
            keys: ["verMovimientos", "verOtrosMovimientos", "aprobarMovimientos", "editarMovimientos", "eliminarMovimientos", "modificarFechas"]
        },
        {
            title: "Módulo de Usuarios",
            keys: ["crearUsuarios", "modificarUsuarios", "eliminarUsuarios", "verPedidos"]
        },
        {
            title: "Horarios y Accesos",
            keys: ["horasIngreso", "obviarIngreso"]
        },
        {
            title: "Configuración y Generales",
            keys: ["configurarCuentas", "consultarPrecios", "verClientes", "verExcel", "cargarProductos"]
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent id="user-modal-content" className="sm:max-w-[800px] p-0 overflow-hidden bg-background max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">
                        {userToEdit ? 'Editar Usuario y Permisos' : 'Registrar Nuevo Usuario'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 text-sm">
                                <Label className="text-foreground font-medium">Nombre de Usuario</Label>
                                <Input
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Ej. admin_miguel"
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1 text-sm">
                                <Label className="text-foreground font-medium">Correo Electrónico</Label>
                                <Input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="correo@ejemplo.com"
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1 text-sm">
                                <Label className="text-foreground font-medium">Contraseña {userToEdit && "(Vacío para no cambiar)"}</Label>
                                <Input
                                    required={!userToEdit} // Required only on creation
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={userToEdit ? "••••••••" : "Ingresa una contraseña segura"}
                                    className="h-10"
                                    minLength={6}
                                />
                            </div>
                            <div className="space-y-1 text-sm">
                                <Label className="text-foreground font-medium">Código de Vendedor</Label>
                                <Input
                                    type="number"
                                    value={formData.vendedor || ""}
                                    onChange={(e) => setFormData({ ...formData, vendedor: parseInt(e.target.value) || 0 })}
                                    placeholder="Ej. 1"
                                    className="h-10"
                                    min={0}
                                />
                            </div>
                        </div>

                        <hr className="border-border" />

                        {/* Permissions Grid */}
                        <div className="space-y-4 mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Permisos Granulares</h3>

                            {permissionCategories.map((category) => (
                                <div key={category.title} className="bg-muted/30 p-4 rounded-lg border border-border">
                                    <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{category.title}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                                        {category.keys.map((key) => (
                                            <div key={key} className="flex items-start space-x-3">
                                                <input
                                                    type="checkbox"
                                                    id={`perm-${key}`}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                                                    checked={formData.permissions[key as keyof typeof formData.permissions]}
                                                    onChange={(e) => handlePermissionChange(key, e.target.checked)}
                                                />
                                                <label
                                                    htmlFor={`perm-${key}`}
                                                    className="text-sm text-foreground/80 leading-snug cursor-pointer select-none"
                                                >
                                                    {permissionLabels[key]}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Footer / Actions */}
                    <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3 mt-auto">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#0b5ed7] hover:bg-[#0a58ca] text-white"
                        >
                            {loading ? (userToEdit ? "Guardando..." : "Creando...") : (userToEdit ? "Guardar Cambios" : "Crear Usuario")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
