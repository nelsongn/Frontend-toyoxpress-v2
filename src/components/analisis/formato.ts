// Formatos de la sección Análisis. Todos los montos de Valery están en USD.

const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** $12,345.67: todos los montos de Análisis llevan 2 decimales. */
export const usd = (n: number | null | undefined) => usd2.format(n ?? 0);
export const usdExacto = usd;
/** $12.3k: solo para las guías del eje de los gráficos. */
export function usdCorto(n: number): string {
    const a = Math.abs(n);
    if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (a >= 10_000) return `$${Math.round(n / 1000)}k`;
    if (a >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${Math.round(n)}`;
}
export const num = (n: number | null | undefined) => entero.format(n ?? 0);
export const pct = (n: number | null | undefined, decimales = 0) =>
    n == null || !isFinite(n) ? "—" : `${(n * 100).toFixed(decimales).replace(".", ",")} %`;
export const decimal = (n: number | null | undefined, decimales = 1) =>
    n == null || !isFinite(n) ? "—" : n.toFixed(decimales).replace(".", ",");

/** '2026-03' → 'mar 26' */
export function mesCorto(mes: string): string {
    const [a, m] = mes.split("-");
    return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
}
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** '2026-03' → 'marzo 2026' */
export function mesLargo(mes: string): string {
    const [a, m] = mes.split("-");
    return `${MESES_LARGOS[Number(m) - 1]} ${a}`;
}

/** Primer y último día de un mes 'AAAA-MM', recortados al rango [desde, hasta]. */
export function diasDelMes(mes: string, desde: string, hasta: string): { desde: string; hasta: string } {
    const [a, m] = mes.split("-").map(Number);
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const ini = `${mes}-01`;
    const fin = `${mes}-${String(ultimo).padStart(2, "0")}`;
    return { desde: ini < desde ? desde : ini, hasta: fin > hasta ? hasta : fin };
}

/** '2026-03-05' → '5 mar 2026' */
export function fecha(f: string | null | undefined): string {
    if (!f) return "—";
    const [a, m, d] = f.slice(0, 10).split("-");
    return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
}

/** Variación entre dos valores: +12 % / −5 %. null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
    if (!anterior) return null;
    return actual / anterior - 1;
}
