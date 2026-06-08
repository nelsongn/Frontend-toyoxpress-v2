"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudUpload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";

interface UploadClientesBtnProps {
    onSuccess?: () => void;
}

export function UploadClientesBtn({ onSuccess }: UploadClientesBtnProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        event.target.value = '';

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            let rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Normalize header accents (same as UploadProductsBtn)
            rows = rows.map((obj: any) => {
                const clean: any = {};
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        const cleanKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        clean[cleanKey] = obj[key];
                    }
                }
                return clean;
            });

            if (!rows || rows.length === 0) {
                throw new Error("El archivo Excel parece estar vacío o mal formateado.");
            }

            const res = await api.post(
                '/clientes/upload',
                { data: rows }
            );

            const { total, inserted, updated } = res.data;

            Swal.fire({
                icon: "success",
                title: "¡Clientes Cargados!",
                html: `
                    <div class="text-left text-sm space-y-1 mt-2">
                        <p><strong>Total procesados:</strong> ${total}</p>
                        <p><strong>✨ Nuevos:</strong> ${inserted}</p>
                        <p><strong>✅ Actualizados:</strong> ${updated}</p>
                    </div>
                `,
                confirmButtonText: "Entendido",
                confirmButtonColor: "#10b981",
            });

            onSuccess?.();

        } catch (error: any) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error de Subida",
                text: error.response?.data?.message || error.message || "No se pudo procesar el archivo Excel.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <label className="relative cursor-pointer group">
            <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
            />
            <Button asChild disabled={isUploading} className="pointer-events-none group-hover:bg-primary/90 transition-all shadow-md">
                <span>
                    {isUploading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                    ) : (
                        <><CloudUpload className="h-4 w-4 mr-2" /> Subir Clientes (Excel)</>
                    )}
                </span>
            </Button>
        </label>
    );
}
