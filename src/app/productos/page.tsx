"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";
import { SyncDashboard } from "@/components/productos/SyncDashboard";
import { UploadProductsBtn } from "@/components/productos/UploadProductsBtn";
import { ProductsTable } from "@/components/productos/ProductsTable";
import RequirePermission from "@/components/auth/RequirePermission";

export default function ProductosPage() {
    return (
        <RequirePermission perm="cargarProductos">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Package className="h-8 w-8 text-primary" />
                            Inventario y Productos
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Gestiona tu catálogo local y sincronízalo automáticamente con WooCommerce vía AWS.
                        </p>
                    </div>
                    <UploadProductsBtn />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="col-span-1 shadow-md border-border/40">
                        <CardHeader>
                            <CardTitle className="text-xl">Datos Locales</CardTitle>
                            <CardDescription>
                                Aquí puedes ver los productos actualmente almacenados en la base de datos local.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProductsTable />
                        </CardContent>
                    </Card>

                    <Card className="col-span-1 shadow-md border-border/40 overflow-hidden">
                        <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-border/40">
                            <CardTitle className="text-xl flex items-center gap-2">
                                Centro de Sincronización
                                <span className="relative flex h-3 w-3 ml-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                            </CardTitle>
                            <CardDescription>
                                Sube un Excel y observa el progreso asíncrono hacia WooCommerce.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <SyncDashboard />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </RequirePermission>
    );
}
