"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudUpload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import RequirePermission from "@/components/auth/RequirePermission";

export function UploadProductsBtn() {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0]; // Asumimos Primera Hoja
            const worksheet = workbook.Sheets[sheetName];

            // Parsear Excel como en V1 (sin omitir con range, usamos lectura natural)
            let arrayCrudo = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Eliminar espacios adicionales o caracteres raros en las cabeceras (Clean Header Accents)
            arrayCrudo = arrayCrudo.map((objeto: any) => {
                const nuevoObjeto: any = {};
                for (const clave in objeto) {
                    if (Object.prototype.hasOwnProperty.call(objeto, clave)) {
                        // Limpiar clave de acentos y retornos de carro (mimic V1 formatPropiedades)
                        const nuevaClave = clave.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        nuevoObjeto[nuevaClave] = objeto[clave];
                    }
                }
                return nuevoObjeto;
            });

            if (!arrayCrudo || arrayCrudo.length === 0) {
                throw new Error("El archivo Excel parece estar vacío o mal formateado.");
            }

            console.log("Subiendo", arrayCrudo.length, "SKUs...");

            // Limpiar File Input
            event.target.value = '';

            // Disparar carga local en backend
            await api.post(
                '/productos/upload',
                {
                    data: arrayCrudo,
                    length: arrayCrudo.length,
                    nombre: file.name
                }
            );

            Swal.fire({
                icon: "success",
                title: "Excel Leído Correctamente",
                text: "El inventario ha sido actualizado localmente. La sincronización a WooCommerce iniciará en breve a la derecha.",
                timer: 4000
            });

            // Disparar evento global para que la tabla local se actualice
            window.dispatchEvent(new Event("local_inventory_updated"));

        } catch (error: any) {
            console.error(error);
            Swal.fire({
                icon: "error",
                title: "Error de Subida",
                text: error.response?.data?.message || error.message || "No se pudo leer el archivo Excel.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <RequirePermission perm="cargarProductos">
            <label className="relative cursor-pointer group">
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                />
                <Button asChild disabled={isUploading} className="pointer-events-none group-hover:bg-primary/90 transition-all shadow-md">
                    <div>
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando Excel...
                            </>
                        ) : (
                            <>
                                <CloudUpload className="mr-2 h-4 w-4" />
                                Subir Inventario (Excel)
                            </>
                        )}
                    </div>
                </Button>
            </label>
        </RequirePermission>
    );
}
