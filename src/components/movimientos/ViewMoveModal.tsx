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
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import RequirePermission from "@/components/auth/RequirePermission";

interface ViewMoveModalProps {
    move: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ViewMoveModal({ move, onClose, onSuccess }: ViewMoveModalProps) {
    const [loading, setLoading] = useState(false);
    const [vale, setVale] = useState("");

    // Reset vale when the selected move changes
    useEffect(() => {
        setVale("");
    }, [move?._id]);

    // Initialize vale strictly when modal opens if it already has one
    if (!move) return null;

    const ident = move.identificador || `ID-${move.id}`;
    const isCajaChica = move.cuenta === 'CajaChica';

    const currentVale = move.vale || (isCajaChica ? ident : "");
    const currentStatus = currentVale ? "Aprobado" : "Pendiente";

    const handleApprove = async () => {
        if (!vale && !isCajaChica) {
            alert("Debes ingresar un número de aprobación (Vale).");
            return;
        }

        setLoading(true);
        try {
            await api.put(`/movimientos/${move._id}/aprobar`, {
                vale: isCajaChica ? ident : vale
            });
            onSuccess();
        } catch (error) {
            console.error("Error approving move:", error);
            alert("No se pudo aprobar el movimiento.");
        } finally {
            setLoading(false);
        }
    };

    const statusColor = currentStatus === 'Pendiente'
        ? 'bg-[#d32f2f] text-white'
        : 'bg-[#7cb342] text-white';

    return (
        <Dialog open={!!move} onOpenChange={(open) => !open && onClose()}>
            <style type="text/css" media="print">
                {`
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-modal, #print-modal * {
                        visibility: visible;
                    }
                    #print-modal {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        transform: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        box-shadow: none !important;
                        border: none !important;
                        max-width: 100% !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                `}
            </style>
            <DialogContent id="print-modal" className="sm:max-w-[700px] p-0 overflow-hidden">
                {/* Header from image: White background, title left, badge middle right, close right */}
                <div className="flex justify-between items-center p-4 border-b bg-background">
                    <DialogTitle className="text-xl font-medium tracking-tight text-foreground">
                        Movimiento: {ident}
                    </DialogTitle>
                    <Badge className={`${statusColor} hover:${statusColor} border-none rounded-md px-4 py-1 font-medium text-sm ml-auto mr-6`}>
                        {currentStatus}
                    </Badge>
                </div>

                {/* Thick red bar below header from image */}
                <div className="h-4 bg-[#a32240] w-full"></div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Datos Generales */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg border-l-2 border-[#a32240] pl-2 text-foreground">Datos Generales</h3>

                            <div className="space-y-1">
                                <span className="text-sm font-semibold text-foreground">Fecha de Creacion</span>
                                <p className="text-sm text-muted-foreground">
                                    {move.creado ? format(new Date(move.creado), "dd/MM/yy", { locale: es }) : move.fechaString}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-sm font-semibold text-foreground">Concepto de movimiento</span>
                                <p className="text-sm text-muted-foreground uppercase">
                                    {move.concepto}
                                </p>
                            </div>
                        </div>

                        {/* Datos de facturacion */}
                        <div className="space-y-4 md:border-l pl-0 md:pl-8">
                            <h3 className="font-bold text-lg border-l-2 border-[#a32240] md:border-none pl-2 md:pl-0 text-foreground">Datos de facturacion</h3>

                            <div className="space-y-3">
                                <div className="flex text-sm">
                                    <span className="font-semibold text-foreground w-24">Usuario:</span>
                                    <span className="text-muted-foreground">{move.usuario || move.name}</span>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-sm font-semibold text-foreground block">Correo Electronico</span>
                                    <span className="text-sm text-muted-foreground block">{move.email || `${((move.usuario || move.name) || 'usuario').toLowerCase().replace(' ', '')}@gmail.com`}</span>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-sm font-semibold text-foreground block">Pagos:</span>
                                    <span className="text-sm text-muted-foreground block capitalize">
                                        {(() => {
                                            const payments = [];
                                            if (move.zelle > 0) payments.push("Zelle");
                                            if (move.efectivo > 0) payments.push("Efectivo");
                                            if (move.dolares > 0) payments.push("Dólares");
                                            if (move.bs > 0) payments.push("Bolívares");
                                            // legacy support
                                            if (move.pago && payments.length === 0) payments.push(typeof move.pago === 'string' ? move.pago : 'N/A');
                                            return payments.length > 0 ? payments.join(", ") : "N/A";
                                        })()}
                                    </span>
                                </div>

                                {(move.bs > 0 || (move.pago && String(move.pago).toLowerCase().includes('bs'))) && (
                                    <div className="flex justify-between items-center text-sm pt-1 pb-2">
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground">Valor $:</span>
                                            <span className="font-medium text-foreground">${Math.abs(move.monto || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground">Cambio:</span>
                                            <span className="font-medium text-foreground">{move.change || (move.bs && move.monto && Math.abs(move.monto) > 0 ? (move.bs / Math.abs(move.monto)).toFixed(2) : 0)}Bs</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground">Bs:</span>
                                            <span className="font-medium text-foreground">{move.bs || 0}Bs</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <span className="text-sm font-semibold text-foreground block">Cuenta</span>
                                    <span className="text-sm text-muted-foreground block uppercase">{move.cuenta}</span>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-sm font-semibold text-foreground block">Monto</span>
                                    <span className="text-sm text-muted-foreground block">{Math.abs(move.monto).toFixed(2).replace('.', ',')} US$</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <hr className="my-6 border-muted" />

                    {/* Bottom input area matching image */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-1/2">
                            <RequirePermission perm="aprobarMovimientos">
                                <span className="text-sm font-semibold text-foreground whitespace-nowrap">Nro de aprobacion</span>
                                <Input
                                    placeholder={currentVale || ""}
                                    value={vale}
                                    onChange={(e) => setVale(e.target.value)}
                                    className="flex-1"
                                    disabled={isCajaChica || currentStatus === 'Aprobado'}
                                />
                            </RequirePermission>
                        </div>

                        <div className="flex items-center gap-3 ml-auto no-print">
                            <Button onClick={() => window.print()} className="bg-[#cc2e1d] hover:bg-[#b02113] text-white px-6">
                                Imprimir
                            </Button>
                            {currentStatus !== 'Aprobado' && (
                                <RequirePermission perm="aprobarMovimientos">
                                    <Button onClick={handleApprove} disabled={loading} className="bg-[#1f8b4c] hover:bg-[#1b5e20] text-white px-6">
                                        {loading ? "Aprobando..." : "Aprobar"}
                                    </Button>
                                </RequirePermission>
                            )}
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
