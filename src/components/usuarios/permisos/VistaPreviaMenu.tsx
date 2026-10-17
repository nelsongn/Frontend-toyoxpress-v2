"use client";

import { LogOut, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigation } from "@/components/layout/navegacion";
import { inicioPara, tienePermiso, veSeccionesGenerales } from "@/lib/permissions";
import type { MapaPermisos } from "./catalogo";

interface Props {
    permisos: MapaPermisos;
    username?: string;
}

/**
 * Muestra el menú tal como lo verá el usuario con los permisos marcados,
 * con las mismas reglas que el Sidebar (lib/permissions + layout/navegacion).
 */
export function VistaPreviaMenu({ permisos, username }: Props) {
    const generales = veSeccionesGenerales(permisos);
    const inicio = inicioPara(permisos);
    const visibles = navigation.filter((item) =>
        item.general ? generales : item.perm ? tienePermiso(permisos, item.perm) : true
    );
    const nombreInicio = navigation.find((i) => i.href === inicio)?.name ?? "Dashboard";
    const tieneSecciones = visibles.some((i) => !i.general);

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Este usuario verá</p>

            <ul className="mt-3 space-y-0.5" aria-label="Vista previa del menú">
                {visibles.map((item) => {
                    const Icono = item.icon;
                    const esInicio = item.href === inicio;
                    return (
                        <li
                            key={item.href}
                            className={cn(
                                "flex items-center gap-2.5 rounded-md px-2.5 py-1 text-sm",
                                esInicio ? "bg-primary text-primary-foreground" : "text-foreground"
                            )}
                        >
                            <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{item.name}</span>
                            {esInicio && <span className="text-[11px] font-medium">Inicio</span>}
                        </li>
                    );
                })}
                {generales && (
                    <li className="flex items-center gap-2.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground">
                        <Map className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Mapa
                    </li>
                )}
                <li className="flex items-center gap-2.5 rounded-md px-2.5 py-1 text-sm text-red-600 dark:text-red-400">
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Cerrar sesión
                </li>
            </ul>

            <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                <li>
                    Al iniciar sesión entra a <span className="font-medium text-foreground">{nombreInicio}</span>.
                </li>
                <li>{permisos.consultarPrecios ? "Ve los precios." : "No ve precios."}</li>
                {!tieneSecciones && <li>Sin secciones asignadas: solo verá un Dashboard vacío.</li>}
                {username === "admin" && (
                    <li className="text-amber-600 dark:text-amber-400">
                        El usuario admin recibe todos los permisos al iniciar sesión, sin importar lo marcado aquí.
                    </li>
                )}
            </ul>
        </div>
    );
}
