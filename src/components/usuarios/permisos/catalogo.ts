import {
    ArrowLeftRight,
    Landmark,
    UserCog,
    Package,
    ShoppingCart,
    Clock,
    type LucideIcon,
} from "lucide-react";

export interface PermisoDef {
    key: string;
    label: string;
    ayuda?: string;
}

export interface ModuloPermisos {
    id: string;
    titulo: string;
    descripcion: string;
    icon: LucideIcon;
    /** Permiso que da acceso a la sección del menú (se muestra como interruptor). */
    acceso?: PermisoDef;
    permisos: PermisoDef[];
    /**
     * true si los subpermisos funcionan aunque el acceso esté apagado
     * (p. ej. "Cargar productos" también da acceso a Productos): no se atenúan.
     */
    subpermisosIndependientes?: boolean;
}

// Módulos en el mismo orden que el menú lateral (layout/navegacion.ts). Las claves (key) son las que guarda
// el backend en user.permissions: no cambiarlas sin migrar los datos.
export const MODULOS_PERMISOS: ModuloPermisos[] = [
    {
        id: "pedidos",
        titulo: "Pedidos y clientes",
        descripcion: "Ventas, historial de pedidos y cartera de clientes.",
        icon: ShoppingCart,
        acceso: { key: "verPedidos", label: "Acceso a Pedidos y Clientes" },
        permisos: [
            { key: "verClientes", label: "Ver todos los clientes", ayuda: "Sin esto, solo ve los de su código de vendedor" },
            { key: "verExcel", label: "Exportar inventario a Excel" },
        ],
    },
    {
        id: "movimientos",
        titulo: "Movimientos",
        descripcion: "Ingresos, egresos y vales de caja.",
        icon: ArrowLeftRight,
        acceso: { key: "verMovimientos", label: "Acceso a Movimientos" },
        permisos: [
            { key: "verOtrosMovimientos", label: "Ver movimientos de otros usuarios", ayuda: "Sin esto, solo ve los suyos" },
            { key: "aprobarMovimientos", label: "Aprobar vales" },
            { key: "editarMovimientos", label: "Editar movimientos" },
            { key: "eliminarMovimientos", label: "Eliminar movimientos" },
            { key: "modificarFechas", label: "Modificar fechas históricas" },
            { key: "verCajaChica", label: "Ver saldo de caja chica" },
            { key: "verSaldoTotal", label: "Ver saldo total" },
        ],
    },
    {
        id: "cuentas",
        titulo: "Cuentas",
        descripcion: "Bancos y cuentas de pago.",
        icon: Landmark,
        acceso: { key: "configurarCuentas", label: "Acceso a Cuentas" },
        permisos: [],
    },
    {
        id: "productos",
        titulo: "Productos",
        descripcion: "Inventario local de repuestos (solo consulta).",
        icon: Package,
        acceso: { key: "verProductos", label: "Acceso a Productos" },
        permisos: [
            { key: "cargarProductos", label: "Subir Excel y sincronizar con WooCommerce", ayuda: "También da acceso a la sección" },
            { key: "consultarPrecios", label: "Ver precios", ayuda: "También en ventas e inventario de Pedidos" },
        ],
        // Independientes: "Cargar" da acceso por sí solo y "Ver precios" aplica también en Pedidos
        subpermisosIndependientes: true,
    },
    {
        id: "usuarios",
        titulo: "Usuarios",
        descripcion: "Con acceso puede ver la sección y crear usuarios.",
        icon: UserCog,
        acceso: { key: "crearUsuarios", label: "Acceso a Usuarios y crear usuarios" },
        permisos: [
            { key: "modificarUsuarios", label: "Editar usuarios y permisos" },
            { key: "eliminarUsuarios", label: "Eliminar usuarios" },
        ],
    },
    {
        id: "horarios",
        titulo: "Horarios",
        descripcion: "Con acceso puede ver y cambiar el horario de ingreso al sistema.",
        icon: Clock,
        acceso: { key: "horasIngreso", label: "Acceso a Horarios" },
        permisos: [
            { key: "obviarIngreso", label: "Entrar fuera del horario", ayuda: "Funciona aunque no tenga acceso a Horarios" },
        ],
        // "Entrar fuera del horario" aplica siempre, no depende de la sección
        subpermisosIndependientes: true,
    },
];

/** Todas las claves de permisos, para inicializar el formulario. */
export const CLAVES_PERMISOS: string[] = MODULOS_PERMISOS.flatMap((m) =>
    [m.acceso?.key, ...m.permisos.map((p) => p.key)].filter((k): k is string => !!k)
);

export type MapaPermisos = Record<string, boolean>;

export function permisosVacios(): MapaPermisos {
    return Object.fromEntries(CLAVES_PERMISOS.map((k) => [k, false]));
}

/** Normaliza lo que viene de la base de datos (puede faltar alguna clave). */
export function permisosDesde(origen: Record<string, unknown> | null | undefined): MapaPermisos {
    return Object.fromEntries(CLAVES_PERMISOS.map((k) => [k, !!origen?.[k]]));
}
