"use client";

import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { MapaPermisos, ModuloPermisos } from "./catalogo";

interface Props {
    modulo: ModuloPermisos;
    permisos: MapaPermisos;
    onChange: (key: string, valor: boolean) => void;
}

// Sin colores con opacidad de variables del tema (bg-muted/30, etc.): en Chrome < 111
// (Windows 7) Tailwind v4 los pinta sólidos. bg-primary/10 sí sirve porque primary es hex fijo.
export function ModuloPermisosCard({ modulo, permisos, onChange }: Props) {
    const Icono = modulo.icon;
    const claves = [modulo.acceso?.key, ...modulo.permisos.map((p) => p.key)].filter((k): k is string => !!k);
    const activos = claves.filter((k) => permisos[k]).length;
    const conAcceso = modulo.acceso ? permisos[modulo.acceso.key] : true;
    // Subpermisos sin efecto mientras el acceso esté apagado. No se desmarcan:
    // solo se atenúan, para no perder lo configurado si se vuelve a activar.
    const atenuado = !conAcceso && !modulo.subpermisosIndependientes;
    const encendido = activos > 0;
    const todosMarcados = activos === claves.length;

    return (
        <section aria-labelledby={`modulo-${modulo.id}`} className="rounded-lg border border-border bg-card">
            <header className="flex items-start gap-3 p-4">
                <div
                    className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-md transition-colors",
                        encendido ? "bg-primary/10 text-primary dark:text-red-400" : "bg-muted text-muted-foreground"
                    )}
                >
                    <Icono className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <h4 id={`modulo-${modulo.id}`} className="text-sm font-semibold text-foreground">
                            {modulo.titulo}
                        </h4>
                        <span className="text-xs tabular-nums text-muted-foreground">
                            {activos} de {claves.length}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{modulo.descripcion}</p>
                </div>
                {modulo.acceso && (
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-xs font-medium text-muted-foreground select-none">
                        Acceso
                        <Switch
                            checked={permisos[modulo.acceso.key]}
                            onCheckedChange={(v) => onChange(modulo.acceso!.key, v)}
                            aria-label={modulo.acceso.label}
                        />
                    </label>
                )}
            </header>

            {modulo.permisos.length > 0 && (
                <div className="border-t border-border px-4 py-3 sm:pl-16">
                    <ul className={cn("grid gap-x-6 gap-y-2.5 sm:grid-cols-2 transition-opacity", atenuado && "opacity-50")}>
                        {modulo.permisos.map((p) => (
                            <li key={p.key} className="flex items-start gap-2.5">
                                <Checkbox
                                    id={`perm-${p.key}`}
                                    checked={permisos[p.key]}
                                    onCheckedChange={(v) => onChange(p.key, v === true)}
                                    className="mt-0.5"
                                />
                                <label htmlFor={`perm-${p.key}`} className="cursor-pointer select-none leading-snug">
                                    <span className="block text-sm text-foreground">{p.label}</span>
                                    {p.ayuda && <span className="block text-xs text-muted-foreground">{p.ayuda}</span>}
                                </label>
                            </li>
                        ))}
                    </ul>
                    {(atenuado || claves.length >= 3) && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            {atenuado ? (
                                <p className="text-xs text-muted-foreground">
                                    Activa el acceso para que estos permisos tengan efecto.
                                </p>
                            ) : (
                                <span />
                            )}
                            {claves.length >= 3 && (
                                <button
                                    type="button"
                                    onClick={() => claves.forEach((k) => onChange(k, !todosMarcados))}
                                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                >
                                    {todosMarcados ? "Quitar todos" : "Marcar todos"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
