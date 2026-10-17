type Permisos = Record<string, boolean> | null | undefined;

/** true si el usuario tiene al menos uno de los permisos indicados. */
export function tienePermiso(permisos: Permisos, perm: string | string[]): boolean {
    if (!permisos) return false;
    const lista = Array.isArray(perm) ? perm : [perm];
    return lista.some((p) => permisos[p] === true);
}

// "Cargar Productos" también da acceso a la sección, para no quitárselo a quien ya lo tenía.
export const PERMISOS_PRODUCTOS = ["verProductos", "cargarProductos"];

// Permisos que muestran algo en el Dashboard (ver controllers/dashboard.ts en el backend).
const PERMISOS_DASHBOARD = ["verMovimientos", "verOtrosMovimientos", "configurarCuentas", "verPedidos"];

// Secciones del menú con permiso, en el mismo orden que el Sidebar.
const SECCIONES: { href: string; perm: string | string[] }[] = [
    { href: "/movimientos", perm: "verMovimientos" },
    { href: "/cuentas", perm: "configurarCuentas" },
    { href: "/usuarios", perm: "crearUsuarios" },
    { href: "/productos", perm: PERMISOS_PRODUCTOS },
    { href: "/clientes", perm: "verPedidos" },
    { href: "/pedidos", perm: "verPedidos" },
];

/**
 * Página de inicio del usuario: "/" (Dashboard) si tiene algo que ver ahí; si no,
 * su primera sección permitida (p. ej. solo "Ver Productos" → /productos).
 * Sin ninguna sección, se queda en "/" como antes.
 */
export function inicioPara(permisos: Permisos): string {
    if (tienePermiso(permisos, PERMISOS_DASHBOARD)) return "/";
    return SECCIONES.find((s) => tienePermiso(permisos, s.perm))?.href ?? "/";
}

/** Dashboard, Configuración y Mapa solo se muestran a quien entra por el Dashboard. */
export function veSeccionesGenerales(permisos: Permisos): boolean {
    return inicioPara(permisos) === "/";
}
