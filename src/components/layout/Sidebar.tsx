"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogOut, MapPin, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import { MapModal } from "./MapModal";
import { api, BASE_URL } from "@/lib/api";
import { tienePermiso, veSeccionesGenerales } from "@/lib/permissions";
import { navigation, type ItemNavegacion } from "./navegacion";

// Preferencia de menú contraído, guardada por equipo
const CLAVE_CONTRAIDO = "toyoxpress-menu-contraido";

function leerContraido() {
    try {
        return typeof window !== "undefined" && localStorage.getItem(CLAVE_CONTRAIDO) === "1";
    } catch {
        return false;
    }
}

// Contadores de la barra (GET /dashboard/contadores), consultados cada minuto
const INTERVALO_CONTADORES_MS = 60_000;
interface Contadores { movimientosPendientes: number; pedidosConError: number }

// Ítem del menú. Activo: fondo suave + barra roja a la izquierda (el rojo sólido queda para las acciones).
const claseItem = (activo: boolean, contraido: boolean) =>
    cn(
        "group relative flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "gap-3 px-3 py-2",
        // Contraído solo en pantallas md+ (en celular el menú desplegable va completo)
        contraido && "md:h-9 md:justify-center md:gap-0 md:px-0 md:py-0",
        activo
            ? "bg-secondary text-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

export function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const [mapOpen, setMapOpen] = useState(false);
    const permissions = useAuthStore((state) => state.permissions);
    const verGenerales = veSeccionesGenerales(permissions);

    // Contraído solo aplica en pantallas md+ (ver las clases md:); en celular siempre completo
    const [contraido, setContraido] = useState(leerContraido);
    const alternarContraido = () => {
        setContraido((c) => {
            try { localStorage.setItem(CLAVE_CONTRAIDO, c ? "0" : "1"); } catch { /* sin almacenamiento */ }
            return !c;
        });
    };

    // Contadores: al cargar, cada minuto y al cambiar de sección. Si el backend aún no tiene
    // el endpoint o falla, simplemente no se muestran.
    const [contadores, setContadores] = useState<Contadores | null>(null);
    useEffect(() => {
        let vigente = true;
        const cargar = () =>
            api.get("/dashboard/contadores")
                .then((r) => { if (vigente && r.data?.ok) setContadores({ movimientosPendientes: r.data.movimientosPendientes || 0, pedidosConError: r.data.pedidosConError || 0 }); })
                .catch(() => { /* sin contadores */ });
        cargar();
        const id = setInterval(cargar, INTERVALO_CONTADORES_MS);
        return () => { vigente = false; clearInterval(id); };
    }, [pathname]);

    // Contador de cada sección: [cantidad, estilo del número, texto para lectores de pantalla, color del punto]
    const contadorDe = (href: string): [number, string, string, string] | null => {
        if (!contadores) return null;
        if (href === "/movimientos" && contadores.movimientosPendientes > 0) {
            return [contadores.movimientosPendientes, "bg-amber-500 text-neutral-950", "pendientes por aprobar", "bg-amber-500"];
        }
        if (href === "/pedidos" && contadores.pedidosConError > 0) {
            return [contadores.pedidosConError, "border border-red-500 text-red-600 dark:text-red-400", "pedidos con error en 24 horas", "bg-red-500"];
        }
        return null;
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const visibles = navigation.filter(
        (item) => (!item.general || verGenerales) && (!item.perm || tienePermiso(permissions, item.perm))
    );
    // Grupos en el orden en que aparecen en navegacion.ts; los vacíos no se muestran
    const sueltos = visibles.filter((i) => !i.grupo);
    const grupos = [...new Set(visibles.filter((i) => i.grupo).map((i) => i.grupo!))].map((g) => ({
        nombre: g,
        items: visibles.filter((i) => i.grupo === g),
    }));

    const esActivo = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

    const enlace = (item: ItemNavegacion) => {
        const activo = esActivo(item.href);
        const contador = contadorDe(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => onClose && onClose()}
                aria-current={activo ? "page" : undefined}
                title={contraido ? (contador ? `${item.name}: ${contador[0]} ${contador[2]}` : item.name) : undefined}
                className={claseItem(activo, contraido)}
            >
                <item.icon
                    className={cn(
                        "h-5 w-5 flex-shrink-0",
                        activo ? "text-primary dark:text-red-400" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                />
                <span className={cn(contraido && "md:sr-only")}>{item.name}</span>
                {contador && (
                    <>
                        {/* Expandido: número; contraído (md+): solo un punto sobre el ícono */}
                        <span
                            className={cn(
                                "ml-auto min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums",
                                contador[1],
                                contraido && "md:hidden"
                            )}
                        >
                            {contador[0]}
                            <span className="sr-only"> {contador[2]}</span>
                        </span>
                        {contraido && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute right-2.5 top-1.5 hidden h-2 w-2 rounded-full md:block",
                                    contador[3]
                                )}
                            />
                        )}
                    </>
                )}
            </Link>
        );
    };

    return (
        <div
            className={cn(
                "flex h-full flex-col bg-card border-r border-border shadow-sm relative transition-[width] duration-200",
                contraido ? "w-64 md:w-16" : "w-64"
            )}
        >
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:hidden text-primary-foreground hover:bg-white/20 p-1 rounded-md z-50"
                    aria-label="Cerrar menú"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
            <div className="flex h-16 items-center justify-center flex-shrink-0 bg-primary text-primary-foreground px-3">
                <img
                    src={`${BASE_URL}/assets/toyoxpress-logo.png`}
                    alt="ToyoXpress"
                    className={cn("h-8 w-auto object-contain", contraido && "md:hidden")}
                />
                {contraido && (
                    <span className="hidden md:inline text-sm font-bold tracking-wider" aria-hidden="true">TX</span>
                )}
            </div>

            <nav aria-label="Menú principal" className="flex flex-1 flex-col overflow-y-auto px-2 py-4">
                <div className="space-y-0.5">{sueltos.map(enlace)}</div>
                {grupos.map((g) => (
                    <div key={g.nombre} className={cn("mt-5", contraido && "md:mt-3 md:border-t md:border-border md:pt-3")}>
                        <p className={cn("px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", contraido && "md:hidden")}>
                            {g.nombre}
                        </p>
                        <div className="space-y-0.5">{g.items.map(enlace)}</div>
                    </div>
                ))}
            </nav>

            <div className="space-y-0.5 border-t border-border px-2 py-3">
                {verGenerales && (
                    <button
                        type="button"
                        onClick={() => setMapOpen(true)}
                        title={contraido ? "Mapa de clientes" : undefined}
                        className={cn(claseItem(false, contraido), "w-full")}
                    >
                        <MapPin className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <span className={cn(contraido && "md:sr-only")}>Mapa de clientes</span>
                    </button>
                )}
                {/* Gris en reposo; rojo solo al pasar el mouse */}
                <button
                    type="button"
                    onClick={handleLogout}
                    title={contraido ? "Cerrar sesión" : undefined}
                    className={cn(
                        "flex w-full items-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "gap-3 px-3 py-2",
                        contraido && "md:h-9 md:justify-center md:gap-0 md:px-0 md:py-0"
                    )}
                >
                    <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span className={cn(contraido && "md:sr-only")}>Cerrar sesión</span>
                </button>
                {/* Solo en pantallas md+ */}
                <button
                    type="button"
                    onClick={alternarContraido}
                    aria-label={contraido ? "Expandir menú" : "Contraer menú"}
                    title={contraido ? "Expandir menú" : undefined}
                    className={cn(
                        "hidden md:flex w-full items-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        contraido ? "h-9 justify-center" : "gap-3 px-3 py-2"
                    )}
                >
                    {contraido ? (
                        <PanelLeftOpen className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    ) : (
                        <>
                            <PanelLeftClose className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                            Contraer menú
                        </>
                    )}
                </button>
            </div>

            <MapModal open={mapOpen} onOpenChange={setMapOpen} />
        </div>
    );
}
