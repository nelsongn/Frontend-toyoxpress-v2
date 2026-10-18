import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Movimiento {
    _id: string;
    id?: number;
    identificador?: string;
    usuario?: string;
    name?: string;
    cuenta?: string;
    concepto?: string;
    monto: number;
    movimiento?: "ingreso" | "egreso";
    status?: string;
    vale?: string;
    fecha?: string;
    creado?: string;
    fechaString?: string;
}

/** Egreso: por el campo movimiento o, en los registros antiguos (V1), por el identificador "E-…". */
export const esEgreso = (m: Movimiento) =>
    m.movimiento === "egreso" || (!m.movimiento && (m.identificador || "").toUpperCase().startsWith("E-"));

/** Aprobado: con nro de aprobación, marcado como aprobado o de CajaChica (se aprueba con su identificador). */
export const esAprobado = (m: Movimiento) => !!m.vale || m.status === "aprobado" || m.cuenta === "CajaChica";

export const identificadorDe = (m: Movimiento) => m.identificador || `ID-${m.id ?? ""}`;

/** Monto con signo: negativo si es egreso. */
export const montoConSigno = (m: Movimiento) => (esEgreso(m) ? -Math.abs(Number(m.monto) || 0) : Math.abs(Number(m.monto) || 0));

export const formatoMonto = (valor: number, conSigno = false) => {
    const texto = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(valor));
    if (!conSigno) return valor < 0 ? `−${texto}` : texto;
    return `${valor < 0 ? "−" : "+"} ${texto}`;
};

export function fechaDe(m: Movimiento): string {
    try {
        const d = m.fecha ? new Date(m.fecha) : m.creado ? new Date(m.creado) : null;
        return d && !isNaN(d.getTime()) ? format(d, "d MMM yyyy", { locale: es }) : m.fechaString || "—";
    } catch {
        return m.fechaString || "—";
    }
}

/** "YYYY-MM-DD" en hora de Caracas. */
export function fechaCaracas(d: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export type AtajoFecha = "hoy" | "semana" | "mes" | "3meses";

/** Rango [inicio, cierre] de cada atajo, en días de Caracas. */
export function rangoAtajo(atajo: AtajoFecha, ahora: Date = new Date()): { inicio: string; cierre: string } {
    const hoy = fechaCaracas(ahora);
    const base = new Date(`${hoy}T12:00:00Z`);
    if (atajo === "hoy") return { inicio: hoy, cierre: hoy };
    if (atajo === "semana") {
        const desdeLunes = (base.getUTCDay() + 6) % 7;
        base.setUTCDate(base.getUTCDate() - desdeLunes);
        return { inicio: base.toISOString().slice(0, 10), cierre: hoy };
    }
    if (atajo === "mes") return { inicio: `${hoy.slice(0, 8)}01`, cierre: hoy };
    base.setUTCMonth(base.getUTCMonth() - 3);
    return { inicio: base.toISOString().slice(0, 10), cierre: hoy };
}

export const ETIQUETA_ATAJO: Record<AtajoFecha, string> = {
    hoy: "Hoy",
    semana: "Esta semana",
    mes: "Este mes",
    "3meses": "Últimos 3 meses",
};
