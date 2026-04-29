"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/useAuthStore";

interface Linea {
    codigo: string;
    nombre: string;
    marca?: string;
    modelo?: string;
    referencia?: string;
    cantidad: number | '';
    precio: number;
    total: number;
    stockMax?: number;
}

interface Props {
    lineas: Linea[];
    onCantidadChange: (index: number, value: number | '') => void;
    onRemove: (index: number) => void;
}

export function CartTable({ lineas, onCantidadChange, onRemove }: Props) {
    const consultarPrecios = useAuthStore((state: any) => state.permissions?.consultarPrecios);

    const totalGeneral = lineas.reduce((s, l) => s + l.total, 0);
    const itemsTotal = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);

    if (lineas.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                El carrito está vacío. Agrega productos usando el buscador de arriba.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-muted/50">
                        <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                            <th className="px-3 py-2.5 text-left w-28">Código</th>
                            <th className="px-3 py-2.5 text-left">Descripción</th>
                            <th className="px-3 py-2.5 text-left w-24">Referencia</th>
                            <th className="px-3 py-2.5 text-left w-24 border-r border-border/50">Modelo</th>
                            <th className="px-3 py-2.5 text-center w-24 border-r border-border/50">Stock Disp.</th>
                            <th className="px-3 py-2.5 text-center w-24">Cantidad</th>
                            {consultarPrecios && <th className="px-3 py-2.5 text-right w-24">P.U.</th>}
                            {consultarPrecios && <th className="px-3 py-2.5 text-right w-28">Total</th>}
                            <th className="px-3 py-2.5 w-10" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {lineas.map((l, i) => (
                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{l.codigo}</td>
                                <td className="px-3 py-2 font-medium text-foreground">{l.nombre}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{l.referencia || "—"}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs border-r border-border/50">{l.modelo || "—"}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Number(l.stockMax) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {l.stockMax ?? "—"}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={l.cantidad}
                                        onChange={e => {
                                            const val = e.target.value;
                                            onCantidadChange(i, val === '' ? '' : parseInt(val));
                                        }}
                                        onBlur={() => {
                                            if (l.cantidad === '' || Number(l.cantidad) < 1) onCantidadChange(i, 1);
                                        }}
                                        onFocus={e => e.target.select()}
                                        className="h-7 w-16 text-center mx-auto text-xs"
                                    />
                                </td>
                                {consultarPrecios && <td className="px-3 py-2 text-right text-muted-foreground">${l.precio.toFixed(2)}</td>}
                                {consultarPrecios && <td className="px-3 py-2 text-right font-semibold">${l.total.toFixed(2)}</td>}
                                <td className="px-3 py-2">
                                    <button
                                        onClick={() => onRemove(i)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-6 text-sm pr-1">
                <span className="text-muted-foreground">Líneas: <span className="font-semibold text-foreground">{lineas.length}</span></span>
                <span className="text-muted-foreground">Items: <span className="font-semibold text-foreground">{itemsTotal}</span></span>
                {consultarPrecios && <span className="text-muted-foreground">Total: <span className="font-bold text-foreground text-base">${totalGeneral.toFixed(2)}</span></span>}
            </div>
        </div>
    );
}
