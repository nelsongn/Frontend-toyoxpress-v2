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
import { Button } from "@/components/ui/button";
import { Pen, Trash2, PlusCircle } from "lucide-react";
import Swal from 'sweetalert2';
import RequirePermission from "@/components/auth/RequirePermission";
import CuentaModal from "./CuentaModal";

export default function CuentasTable() {
    const [cuentas, setCuentas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cuentaToEdit, setCuentaToEdit] = useState<any | null>(null);

    const fetchCuentas = async () => {
        try {
            setLoading(true);
            const res = await api.get('/cuentas');
            if (res.data.success) {
                setCuentas(res.data.cuentas);
            }
        } catch (error) {
            console.error("Error fetching cuentas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCuentas();
    }, []);

    const handleDelete = async (id: string, label: string) => {
        const result = await Swal.fire({
            title: `¿Eliminar la cuenta "${label}"?`,
            text: 'Esta cuenta desaparecerá de las listas, pero se conservará en el historial contable (Soft Delete).',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await api.delete(`/cuentas/${id}`);
                if (res.data.success) {
                    Swal.fire('¡Eliminada!', 'La cuenta ha sido dada de baja exitosamente.', 'success');
                    fetchCuentas();
                }
            } catch (error: any) {
                console.error("Error deleting cuenta:", error);
                Swal.fire('Error', error.response?.data?.message || 'Hubo un problema al eliminar la cuenta.', 'error');
            }
        }
    };

    const handleEditClick = (cuenta: any) => {
        setCuentaToEdit(cuenta);
        setIsModalOpen(true);
    };

    const handleNewClick = () => {
        setCuentaToEdit(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end p-2 bg-muted/50 rounded-xl border border-border">
                <RequirePermission perm="configurarCuentas">
                    <Button
                        onClick={handleNewClick}
                        className="bg-[#a32240] hover:bg-[#8e1d38] text-white flex items-center gap-2 font-medium transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Crear una cuenta
                    </Button>
                </RequirePermission>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30 border-b">
                            <TableHead className="font-bold text-foreground py-4 w-1/3">Nombre de la cuenta</TableHead>
                            <TableHead className="font-bold text-foreground w-1/3">Etiqueta de Color</TableHead>
                            <TableHead className="font-bold text-foreground text-center">Contabilidad</TableHead>
                            <TableHead className="font-bold text-foreground text-right pr-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                        ) : cuentas.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay cuentas registradas.</TableCell></TableRow>
                        ) : cuentas.map((cuenta) => (
                            <TableRow key={cuenta._id} className="border-b last:border-0 hover:bg-muted/10">
                                <TableCell className="py-4 font-semibold text-foreground text-base">
                                    {cuenta.label.toUpperCase()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full border shadow-sm"
                                            style={{ backgroundColor: cuenta.color || '#000000' }}
                                        ></div>
                                        <span className="text-sm font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border">
                                            {cuenta.color || '#000000'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {cuenta.saldo ? (
                                        <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                            Suma al Saldo Total
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                                            Excluida del Saldo
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-2">
                                        <RequirePermission perm="configurarCuentas">
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditClick(cuenta)}
                                                className="bg-[#a32240] hover:bg-[#8e1d38] text-white"
                                            >
                                                <Pen className="w-4 h-4" />
                                            </Button>
                                        </RequirePermission>

                                        <RequirePermission perm="configurarCuentas">
                                            <Button
                                                size="sm"
                                                onClick={() => handleDelete(cuenta._id, cuenta.label)}
                                                className="bg-[#dc3545] hover:bg-[#bb2d3b] text-white"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </RequirePermission>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {isModalOpen && (
                <CuentaModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchCuentas();
                    }}
                    cuenta={cuentaToEdit}
                />
            )}
        </div>
    );
}
