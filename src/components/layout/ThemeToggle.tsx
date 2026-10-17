"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const sinSuscripcion = () => () => {};

/**
 * Interruptor claro/oscuro del Header. El tema se guarda en el navegador (next-themes),
 * así que cada equipo recuerda el suyo.
 */
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    // El tema solo se conoce en el navegador: false en el servidor, true en el cliente
    // (evita el desajuste de hidratación sin setState dentro de un efecto)
    const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);

    const oscuro = montado && resolvedTheme === "dark";

    return (
        <button
            type="button"
            role="switch"
            aria-checked={oscuro}
            aria-label="Modo oscuro"
            title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            onClick={() => setTheme(oscuro ? "light" : "dark")}
            className="relative inline-flex h-8 w-[60px] shrink-0 items-center rounded-full border border-border bg-muted p-0.5 transition-colors hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {/* Perilla: se ubica bajo el ícono del tema activo */}
            <span
                aria-hidden="true"
                className={cn(
                    "absolute top-0.5 left-0.5 h-[26px] w-[26px] rounded-full bg-card shadow-sm transition-transform duration-200 ease-out",
                    oscuro && "translate-x-[28px]"
                )}
            />
            <span className="relative z-10 grid h-[26px] w-[26px] place-items-center">
                <Sun className={cn("h-4 w-4 transition-colors", oscuro ? "text-muted-foreground" : "text-amber-500")} aria-hidden="true" />
            </span>
            <span className="relative z-10 ml-0.5 grid h-[26px] w-[26px] place-items-center">
                <Moon className={cn("h-4 w-4 transition-colors", oscuro ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
            </span>
        </button>
    );
}
