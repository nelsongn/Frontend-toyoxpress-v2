import type { DatosSincronizacion } from "./EstadoSincronizacion";

export interface PedidoReciente {
    _id: string;
    estado?: "pendiente" | "procesando" | "completado" | "error";
    creadoEn?: string;
    createdAt?: string;
    vendedorName?: string;
    vendedorId?: string;
    payload?: { cliente?: { Nombre?: string }; total?: number };
}

export interface MovimientoReciente {
    _id: string;
    tipo: "ingreso" | "egreso";
    referencia: string;
    monto: number;
}

export interface CuentaSaldo {
    nombre: string;
    balance: number;
    color?: string;
}

export interface DashboardStats {
    ok: boolean;
    esAdmin: boolean;
    puedeVerCuentas: boolean;
    puedeVerMovimientos: boolean;
    puedeVerPedidos: boolean;
    financiero: {
        ingresosHoy: number;
        egresosHoy: number;
        saldoTotal: number;
    };
    catalogo: {
        totalClientes: number;
        totalProductos: number;
    };
    pendientesAprobar: number;
    cuentas: CuentaSaldo[];
    recientes: {
        pedidos: PedidoReciente[];
        movimientos: MovimientoReciente[];
    };
    /** Opcional: no viene si el backend aún no está actualizado */
    sincronizacion?: DatosSincronizacion;
}

export const formatoMoneda = (monto: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(monto || 0);

export const formatoFecha = (fecha?: string) =>
    fecha
        ? new Date(fecha).toLocaleString("es-VE", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas",
          })
        : "—";
