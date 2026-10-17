// Hora de Caracas y estado del horario de ingreso. Misma lógica que HorarioShield
// (que es el que bloquea el acceso): día de la semana y hora según America/Caracas.

export const ZONA_CARACAS = "America/Caracas";

export interface DiaHorario {
    dia: string;
    cerrado: boolean;
    apertura: string;
    cierre: string;
}

export interface HoraCaracas {
    /** "Viernes", con mayúscula y tilde, como se guarda en el horario */
    dia: string;
    horas: number;
    minutos: number;
    segundos: number;
    /** "17 de octubre de 2026" */
    fecha: string;
}

const DIAS: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", "miércoles": "Miércoles", jueves: "Jueves",
    viernes: "Viernes", "sábado": "Sábado", domingo: "Domingo",
};

export function horaCaracas(ms: number): HoraCaracas {
    const partes = new Intl.DateTimeFormat("es-VE", {
        timeZone: ZONA_CARACAS,
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(new Date(ms));
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
    const fecha = new Intl.DateTimeFormat("es-VE", {
        timeZone: ZONA_CARACAS,
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(ms));
    return {
        dia: DIAS[valor("weekday").toLowerCase()] ?? valor("weekday"),
        horas: Number(valor("hour")) % 24,
        minutos: Number(valor("minute")),
        segundos: Number(valor("second")),
        fecha,
    };
}

export type EstadoHorario = "dentro" | "fuera" | "cerrado" | "sin-horario";

/** Si a esa hora de Caracas se puede ingresar según el horario (incluye horarios que cruzan medianoche). */
export function estadoHorario(horario: DiaHorario[], hora: HoraCaracas): { estado: EstadoHorario; hoy?: DiaHorario } {
    const hoy = horario.find((h) => h.dia === hora.dia);
    if (!hoy) return { estado: "sin-horario" };
    if (hoy.cerrado) return { estado: "cerrado", hoy };

    const aMin = (hhmm: string) => {
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
    };
    const ahora = hora.horas * 60 + hora.minutos + hora.segundos / 60;
    const apertura = aMin(hoy.apertura);
    const cierre = aMin(hoy.cierre);
    const dentro = cierre < apertura
        ? ahora >= apertura || ahora <= cierre // cruza medianoche
        : ahora >= apertura && ahora <= cierre;
    return { estado: dentro ? "dentro" : "fuera", hoy };
}
