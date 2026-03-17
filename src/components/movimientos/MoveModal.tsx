"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import Swal from 'sweetalert2';

interface MoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    move?: any | null;
}

export default function MoveModal({ isOpen, onClose, onSuccess, move }: MoveModalProps) {
    const user = useAuthStore((state: any) => state.name);
    const id_usuario = useAuthStore((state: any) => state.id);
    const canModifyDate = useAuthStore((state: any) => state.permissions?.modificarFechas);

    const [loading, setLoading] = useState(false);
    const [cuentasDB, setCuentasDB] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        movimiento: "ingreso",
        cuenta: "",
        efectivo: "",
        zelle: "",
        otro: "",
        valorEnDolares: "",
        valorDeCambio: "",
        cantidadDeBolivares: "",
        total: "0.00",
        concepto: "",
        fecha: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (isOpen) {
            const loadCuentas = async () => {
                try {
                    const resCuentas = await api.get('/cuentas');
                    if (resCuentas.data.success) {
                        setCuentasDB(resCuentas.data.cuentas || []);
                    }
                } catch (error) {
                    console.error("Error fetching cuentas:", error);
                }
            };
            loadCuentas();

            if (move) {
                // Formatting date for HTML input type="date"
                let formattedDate = new Date().toISOString().split('T')[0];
                if (move.fecha) {
                    formattedDate = new Date(move.fecha).toISOString().split('T')[0];
                } else if (move.fechaString && move.fechaString.includes('/')) {
                    // Try to parse DD/MM/YYYY if that's what's saved
                    const parts = move.fechaString.split('/');
                    if (parts.length === 3) {
                        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                } else if (move.fechaString) {
                    formattedDate = move.fechaString;
                }

                setFormData({
                    movimiento: move.movimiento || "ingreso",
                    cuenta: move.cuenta || "",
                    efectivo: move.efectivo ? move.efectivo.toString() : "",
                    zelle: move.zelle ? move.zelle.toString() : "",
                    otro: move.otro ? move.otro.toString() : "",
                    valorEnDolares: move.dolares ? move.dolares.toString() : (move.bs > 0 && move.change > 0 ? (move.bs / move.change).toFixed(2) : ""),
                    valorDeCambio: move.change ? move.change.toString() : "",
                    cantidadDeBolivares: move.bs ? move.bs.toString() : "",
                    total: move.monto ? Math.abs(move.monto).toString() : "0.00",
                    concepto: move.concepto || "",
                    fecha: formattedDate
                });
            } else {
                setFormData({
                    movimiento: "ingreso",
                    cuenta: "",
                    efectivo: "",
                    zelle: "",
                    otro: "",
                    valorEnDolares: "",
                    valorDeCambio: "",
                    cantidadDeBolivares: "",
                    total: "0.00",
                    concepto: "",
                    fecha: new Date().toISOString().split('T')[0]
                });
            }
        }
    }, [isOpen, move]);

    // Calculate Bolivares when Value in Dollars or Exchange Rate changes
    useEffect(() => {
        const numValorDolares = parseFloat(formData.valorEnDolares) || 0;
        const numValorCambio = parseFloat(formData.valorDeCambio) || 0;
        if (numValorDolares > 0 && numValorCambio > 0) {
            setFormData(prev => ({ ...prev, cantidadDeBolivares: (numValorDolares * numValorCambio).toString() }));
        } else if (parseFloat(formData.cantidadDeBolivares) > 0 && numValorCambio > 0 && !formData.valorEnDolares) {
            // Reverse calculation not strictly needed unless user types backwards, but good to have
            setFormData(prev => ({ ...prev, valorEnDolares: (parseFloat(formData.cantidadDeBolivares) / numValorCambio).toString() }));
        }
    }, [formData.valorEnDolares, formData.valorDeCambio]);


    // Calculate Total when any dollar amount changes
    useEffect(() => {
        const effectivo = parseFloat(formData.efectivo) || 0;
        const zelle = parseFloat(formData.zelle) || 0;
        const otro = parseFloat(formData.otro) || 0;
        const valorBolivaresEnDolares = parseFloat(formData.cantidadDeBolivares) > 0 && parseFloat(formData.valorDeCambio) > 0
            ? parseFloat(formData.cantidadDeBolivares) / parseFloat(formData.valorDeCambio)
            : (parseFloat(formData.valorEnDolares) || 0);

        const sum = effectivo + zelle + otro + valorBolivaresEnDolares;
        setFormData(prev => ({ ...prev, total: sum.toFixed(2) }));
    }, [formData.efectivo, formData.zelle, formData.otro, formData.valorEnDolares, formData.cantidadDeBolivares, formData.valorDeCambio]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const numTotal = parseFloat(formData.total);
            const numEfectivo = parseFloat(formData.efectivo) || 0;
            const numZelle = parseFloat(formData.zelle) || 0;
            const numOtro = parseFloat(formData.otro) || 0;
            const numBolivares = parseFloat(formData.cantidadDeBolivares) || 0;
            const numCambio = parseFloat(formData.valorDeCambio) || 0;
            const numDolares = parseFloat(formData.valorEnDolares) || 0;

            const payload = {
                usuario: user || "Admin",
                id_usuario: id_usuario || "123",
                cuenta: formData.cuenta,
                movimiento: formData.movimiento,
                concepto: formData.concepto,
                monto: numTotal,
                dolares: numDolares,
                bs: numBolivares,
                change: numCambio,
                zelle: numZelle,
                efectivo: numEfectivo,
                otro: numOtro,
                fechaString: formData.fecha
            };

            if (move && move._id) {
                const result = await Swal.fire({
                    title: '¿Confirmar Edición?',
                    text: 'Se actualizarán los datos de este movimiento.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#0b5ed7',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sí, editar',
                    cancelButtonText: 'Cancelar',
                    target: document.getElementById('move-modal-content')
                });

                if (result.isConfirmed) {
                    await api.put(`/movimientos/${move._id}`, payload);
                    Swal.fire({
                        title: '¡Editado!',
                        text: 'El movimiento ha sido actualizado.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        target: document.getElementById('move-modal-content')
                    });
                } else {
                    setLoading(false);
                    return; // Abort submission
                }
            } else {
                await api.post("/movimientos", payload);
            }

            // Reset form
            setFormData({
                movimiento: "ingreso",
                cuenta: "",
                efectivo: "",
                zelle: "",
                otro: "",
                valorEnDolares: "",
                valorDeCambio: "",
                cantidadDeBolivares: "",
                total: "0.00",
                concepto: "",
                fecha: new Date().toISOString().split('T')[0]
            })

            onSuccess();
        } catch (error) {
            console.error("Error saving movement", error);
            alert("Error guardando el movimiento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent id="move-modal-content" className="sm:max-w-[700px] p-0 overflow-hidden bg-background">
                <DialogHeader className="sr-only">
                    <DialogTitle>{move ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">

                    {/* V1 Layout Match */}
                    <div className="p-8 space-y-6">

                        {/* Header Inputs */}
                        <div className="space-y-4">
                            <div className="space-y-1 text-sm">
                                <Label className="text-foreground font-normal">Tipo de Movimiento:</Label>
                                <select
                                    required
                                    value={formData.movimiento}
                                    onChange={(e) => setFormData({ ...formData, movimiento: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-[1px]:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="" disabled className="bg-background text-foreground">Select...</option>
                                    <option value="ingreso" className="bg-background text-foreground">Ingreso</option>
                                    <option value="egreso" className="bg-background text-foreground">Egreso</option>
                                </select>
                            </div>

                            <div className="space-y-1 text-sm">
                                <Label className="text-foreground font-normal">Cuenta Afectada:</Label>
                                <select
                                    required
                                    value={formData.cuenta}
                                    onChange={(e) => setFormData({ ...formData, cuenta: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-[1px]:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="" disabled className="bg-background text-foreground">Select...</option>
                                    {cuentasDB.map((c) => (
                                        <option key={c.value} value={c.value} className="bg-background text-foreground">{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Forma de Pago/Cobro Section */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-2xl font-medium tracking-tight text-foreground border-none">Forma de Pago/Cobro</h3>

                            {/* Top row payments */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground font-normal text-xs">Efectivo:</Label>
                                    <div className="relative">
                                        <Input
                                            type="number" step="0.01" min="0"
                                            value={formData.efectivo}
                                            onChange={(e) => setFormData({ ...formData, efectivo: e.target.value })}
                                            className="w-full pr-8 h-10"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground font-normal text-xs">Zelle:</Label>
                                    <div className="relative">
                                        <Input
                                            type="number" step="0.01" min="0"
                                            value={formData.zelle}
                                            onChange={(e) => setFormData({ ...formData, zelle: e.target.value })}
                                            className="w-full pr-8 h-10"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground font-normal text-xs">Otro:</Label>
                                    <div className="relative">
                                        <Input
                                            type="number" step="0.01" min="0"
                                            value={formData.otro}
                                            onChange={(e) => setFormData({ ...formData, otro: e.target.value })}
                                            className="w-full pr-8 h-10"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bolivares row */}
                            <div className="space-y-1 pt-2">
                                <Label className="text-muted-foreground font-normal text-xs">Bolivares:</Label>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="relative flex items-center">
                                        <span className="text-sm text-foreground mr-2 whitespace-nowrap">Valor en dolares:</span>
                                        <div className="relative w-full">
                                            <Input
                                                type="number" step="0.01" min="0"
                                                value={formData.valorEnDolares}
                                                onChange={(e) => setFormData({ ...formData, valorEnDolares: e.target.value })}
                                                className="w-full pr-8 h-10"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                                        </div>
                                    </div>
                                    <div className="relative flex items-center">
                                        <span className="text-sm text-foreground mr-2 whitespace-nowrap">Valor de cambio:</span>
                                        <div className="relative w-full">
                                            <Input
                                                type="number" step="0.01" min="0"
                                                disabled={!formData.valorEnDolares || parseFloat(formData.valorEnDolares) <= 0}
                                                value={formData.valorDeCambio}
                                                onChange={(e) => setFormData({ ...formData, valorDeCambio: e.target.value })}
                                                className={`w-full pr-8 h-10 ${(!formData.valorEnDolares || parseFloat(formData.valorEnDolares) <= 0) ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
                                        </div>
                                    </div>
                                    <div className="relative flex items-center">
                                        <span className="text-sm text-foreground mr-2 whitespace-nowrap leading-tight">Cantidad de<br />bolivares:</span>
                                        <div className="relative w-full">
                                            <Input
                                                type="number" step="0.01" min="0"
                                                readOnly
                                                value={formData.cantidadDeBolivares}
                                                className="w-full pr-8 h-10 bg-gray-50 text-gray-600 font-medium cursor-default focus-visible:ring-0"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Bs</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Row */}
                            <div className="pt-4 pb-2">
                                <div className="w-1/3 space-y-1">
                                    <Label className="text-muted-foreground font-normal text-xs">Total:</Label>
                                    <div className="relative">
                                        <Input
                                            disabled
                                            value={formData.total}
                                            className="w-full pr-8 h-10 font-bold bg-transparent"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Concepto y Fecha */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-foreground font-normal text-sm">Concepto de Registro:</Label>
                                <textarea
                                    required
                                    value={formData.concepto}
                                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                />
                            </div>

                            <div className="space-y-1 w-32">
                                <Label className="text-foreground font-normal text-sm block mb-1">Fecha:</Label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    disabled={!canModifyDate}
                                    className={`text-white px-3 py-2 rounded-md text-sm outline-none w-full ${!canModifyDate ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#c43224] cursor-pointer'}`}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="mt-auto px-8 py-4 bg-muted/30 border-t flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                        >
                            Cerrar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || parseFloat(formData.total) <= 0}
                            className="bg-[#0b5ed7] hover:bg-[#0a58ca] text-white"
                        >
                            {loading ? (move ? "Editando..." : "Creando...") : (move ? "Editar" : "Crear")}
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    );
}
