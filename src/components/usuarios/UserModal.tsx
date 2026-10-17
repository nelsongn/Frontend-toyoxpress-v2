import { useState, useEffect, useRef } from "react";
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

function escaparHtml(texto: string) {
    return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Los gestores de contraseñas (extensiones) ignoran autoComplete="off" y rellenaban este
// formulario con el login de quien lo usa. Defensas: (1) al editar, el campo contraseña solo
// aparece al pedirlo; (2) los campos son de solo lectura hasta un clic o un Tab real
// (los gestores no rellenan campos readOnly) y, mientras tanto, se ignora lo que escriban en ellos; (3) la confirmación muestra qué datos cambian.
type CampoTexto = "nombre" | "correo" | "clave" | "vendedor";

export default function UserModal({ isOpen, onClose, onSuccess, userToEdit }: UserModalProps) {
    const [loading, setLoading] = useState(false);
    const [cambiarClave, setCambiarClave] = useState(false);
    const [desbloqueados, setDesbloqueados] = useState<Record<CampoTexto, boolean>>({ nombre: false, correo: false, clave: false, vendedor: false });
    const desbloquear = (campo: CampoTexto) => setDesbloqueados((d) => (d[campo] ? d : { ...d, [campo]: true }));
    // Solo una interacción real desbloquea un campo: clic/toque o llegar con Tab. El foco por sí
    // solo no, porque los gestores de contraseñas enfocan los campos por código antes de rellenarlos.
    const refNombre = useRef<HTMLInputElement>(null);
    const refCorreo = useRef<HTMLInputElement>(null);
    const refClave = useRef<HTMLInputElement>(null);
    const refVendedor = useRef<HTMLInputElement>(null);
    const interaccion = (campo: CampoTexto) => ({
        onPointerDown: () => desbloquear(campo),
        onKeyUp: (e: React.KeyboardEvent) => { if (e.key === "Tab") desbloquear(campo); },
    });

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        vendedor: 0,
        permissions: permisosVacios() as MapaPermisos,
    });

    useEffect(() => {
        if (isOpen) {
            setCambiarClave(false);
            setDesbloqueados({ nombre: false, correo: false, clave: false, vendedor: false });
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

    // Algunas extensiones cambian el texto de los campos sin disparar eventos: el estado queda
    // bien (es lo que se guarda), pero en pantalla se ve el login ajeno. Mientras un campo está
    // bloqueado, se vuelve a mostrar su valor real.
    useEffect(() => {
        if (!isOpen) return;
        const campos: [CampoTexto, React.RefObject<HTMLInputElement | null>, string][] = [
            ["nombre", refNombre, formData.username],
            ["correo", refCorreo, formData.email],
            ["clave", refClave, formData.password],
            ["vendedor", refVendedor, formData.vendedor ? String(formData.vendedor) : ""],
        ];
        const id = setInterval(() => {
            for (const [campo, ref, esperado] of campos) {
                const el = ref.current;
                if (el && !desbloqueados[campo] && el.value !== esperado) el.value = esperado;
            }
        }, 250);
        return () => clearInterval(id);
    }, [isOpen, formData.username, formData.email, formData.password, formData.vendedor, desbloqueados]);

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

        // Validación manual: el navegador no valida "required"/"minLength" en campos readOnly
        const faltante = !formData.username.trim()
            ? "Escribe el nombre de usuario."
            : !formData.email.trim()
                ? "Escribe el correo electrónico."
                : (!userToEdit || cambiarClave) && formData.password.length > 0 && formData.password.length < 6
                    ? "La contraseña debe tener al menos 6 caracteres."
                    : !userToEdit && !formData.password
                        ? "Escribe una contraseña para el nuevo usuario."
                        : null;
        if (faltante) {
            Swal.fire({ title: 'Falta un dato', text: faltante, icon: 'info', confirmButtonColor: COLOR_MARCA, target: document.getElementById('user-modal-content') });
            return;
        }

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
                // Mostrar explícitamente los datos de acceso que cambian, para detectar
                // un autocompletado del navegador antes de guardarlo.
                const cambios: string[] = [];
                if (formData.username !== (userToEdit.username || "")) {
                    cambios.push(`Nombre de usuario: <b>${escaparHtml(userToEdit.username || "")}</b> → <b>${escaparHtml(formData.username)}</b>`);
                }
                if (formData.email !== (userToEdit.email || "")) {
                    cambios.push(`Correo: <b>${escaparHtml(userToEdit.email || "")}</b> → <b>${escaparHtml(formData.email)}</b>`);
                }
                if (formData.password) cambios.push("Se cambiará la <b>contraseña</b>");
                const detalle = cambios.length
                    ? `<p style="margin-bottom:8px">Atención, también cambian sus datos de acceso:</p><ul style="text-align:left;display:inline-block;margin:0">${cambios.map((c) => `<li>• ${c}</li>`).join("")}</ul>`
                    : "Se actualizarán los permisos y datos de este usuario.";

                const result = await Swal.fire({
                    title: '¿Confirmar Edición?',
                    html: detalle,
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
    // Encabezado con los datos guardados del usuario (no con lo que haya en los campos)
    const subtitulo = userToEdit
        ? [userToEdit.email, userToEdit.vendedor ? `vendedor ${userToEdit.vendedor}` : null].filter(Boolean).join(" · ")
        : "Completa los datos y elige qué secciones podrá usar.";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent id="user-modal-content" className="sm:max-w-[960px] p-0 gap-0 overflow-hidden bg-background max-h-[92vh] flex flex-col">
                <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-6 py-4 text-left">
                    <div
                        aria-hidden="true"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary dark:text-red-400"
                    >
                        {iniciales(userToEdit?.username || formData.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <DialogTitle className="text-lg truncate">
                            {userToEdit ? `Editar usuario · ${userToEdit.username}` : 'Nuevo usuario'}
                        </DialogTitle>
                        <DialogDescription className="truncate">{subtitulo}</DialogDescription>
                    </div>
                </DialogHeader>

                {/* autoComplete: el navegador NO debe rellenar este formulario con el login guardado
                    (pisaba nombre, correo y contraseña del usuario que se edita). Por eso los ids
                    tampoco dicen "username"/"email"/"password", que activan su detección de login. */}
                <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* Datos del usuario */}
                        <section aria-labelledby="datos-usuario" className="space-y-3">
                            <h3 id="datos-usuario" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Datos del usuario
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="campo-nombre">Nombre de usuario</Label>
                                    <Input
                                        id="campo-nombre"
                                        readOnly={!desbloqueados.nombre}
                                        {...interaccion("nombre")}
                                        ref={refNombre}
                                        name="campo-nombre"
                                        autoComplete="off"
                                        required
                                        value={formData.username}
                                        onChange={(e) => { if (desbloqueados.nombre) setFormData({ ...formData, username: e.target.value }); }}
                                        placeholder="admin_miguel"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="campo-correo">Correo electrónico</Label>
                                    <Input
                                        id="campo-correo"
                                        readOnly={!desbloqueados.correo}
                                        {...interaccion("correo")}
                                        ref={refCorreo}
                                        name="campo-correo"
                                        autoComplete="off"
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => { if (desbloqueados.correo) setFormData({ ...formData, email: e.target.value }); }}
                                        placeholder="correo@ejemplo.com"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="campo-clave">Contraseña</Label>
                                    {userToEdit && !cambiarClave ? (
                                        // Al editar, sin campo de contraseña hasta pedirlo: así los
                                        // gestores de contraseñas no detectan un formulario de login.
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 w-full justify-start font-normal text-muted-foreground"
                                            onClick={() => { setCambiarClave(true); desbloquear("clave"); }}
                                        >
                                            Cambiar contraseña
                                        </Button>
                                    ) : (
                                        <Input
                                            id="campo-clave"
                                            name="campo-clave"
                                            autoComplete="new-password"
                                            readOnly={!desbloqueados.clave}
                                            {...interaccion("clave")}
                                            ref={refClave}
                                            autoFocus={!!userToEdit}
                                            required={!userToEdit} // Required only on creation
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => { if (desbloqueados.clave) setFormData({ ...formData, password: e.target.value }); }}
                                            placeholder={userToEdit ? "Nueva contraseña" : "Mínimo 6 caracteres"}
                                            className="h-10"
                                            minLength={6}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="campo-vendedor">Código de vendedor</Label>
                                    <Input
                                        id="campo-vendedor"
                                        readOnly={!desbloqueados.vendedor}
                                        {...interaccion("vendedor")}
                                        ref={refVendedor}
                                        name="campo-vendedor"
                                        autoComplete="off"
                                        type="number"
                                        value={formData.vendedor || ""}
                                        onChange={(e) => { if (desbloqueados.vendedor) setFormData({ ...formData, vendedor: parseInt(e.target.value) || 0 }); }}
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
