// Lectura de la lista de precios de un proveedor (Excel o CSV) en el navegador.
// Cada proveedor manda su formato: se busca la fila de encabezados, se adivina qué columna es
// cada dato (la persona puede corregirlo) y se descartan las filas que no son artículos
// (títulos de sección como "TOYOTA", encabezados repetidos, filas vacías).

export const CAMPOS = [
    { id: "codigo", nombre: "Código del proveedor", requerido: false },
    { id: "numeroPieza", nombre: "Número de pieza", requerido: true },
    { id: "descripcion", nombre: "Descripción", requerido: false },
    { id: "marca", nombre: "Marca", requerido: false },
    { id: "pais", nombre: "País / origen", requerido: false },
    { id: "precio", nombre: "Precio", requerido: true },
    { id: "disponible", nombre: "Disponible", requerido: false },
] as const;
export type Campo = (typeof CAMPOS)[number]["id"];
/** Para cada dato, el número de columna (0 = la primera) o null si la lista no lo trae. */
export type Columnas = Record<Campo, number | null>;

export interface ArticuloLista {
    codigo: string | null; numeroPieza: string; descripcion: string | null;
    marca: string | null; pais: string | null; precio: number; disponible: number | null;
}

type Celda = string | number | boolean | null | undefined;

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Primera hoja del archivo como filas de celdas. */
export async function leerArchivo(archivo: File): Promise<Celda[][]> {
    const XLSX = await import("xlsx");
    const libro = XLSX.read(await archivo.arrayBuffer(), { type: "array" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Celda[]>(hoja, { header: 1, blankrows: false, defval: null });
}

/** La fila de encabezados: la primera (de las 30 primeras) que nombra un precio y un código. */
export function filaEncabezado(filas: Celda[][]): number {
    for (let i = 0; i < Math.min(filas.length, 30); i++) {
        const textos = (filas[i] ?? []).map((c) => sinAcentos(String(c ?? "")));
        if (textos.some((t) => /precio|price|costo/.test(t)) && textos.some((t) => /codigo|parte|part|pieza|item|sku|ref/.test(t))) return i;
    }
    return -1;
}

/**
 * Adivina las columnas por el nombre del encabezado. Si una lista anterior guardó qué
 * encabezado era cada dato, se respeta eso primero (el mismo proveedor manda el mismo formato).
 */
export function adivinarColumnas(encabezados: Celda[], previo?: Partial<Record<Campo, string>> | null): Columnas {
    const textos = encabezados.map((c) => sinAcentos(String(c ?? "")));
    const col: Columnas = { codigo: null, numeroPieza: null, descripcion: null, marca: null, pais: null, precio: null, disponible: null };
    const usado = new Set<number>();
    const tomar = (campo: Campo, prueba: (t: string) => boolean) => {
        if (col[campo] != null) return;
        const i = textos.findIndex((t, j) => !usado.has(j) && t && prueba(t));
        if (i >= 0) { col[campo] = i; usado.add(i); }
    };
    if (previo) for (const campo of Object.keys(previo) as Campo[]) {
        const nombre = previo[campo];
        if (nombre) tomar(campo, (t) => t === sinAcentos(nombre));
    }
    // El código propio del proveedor suele decir su nombre o "item"; el número de pieza, solo "código"
    tomar("codigo", (t) => /codigo\s+\w+|item|sku|cod\.?\s*prov/.test(t) && !/parte|pieza|oem/.test(t));
    tomar("numeroPieza", (t) => /parte|pieza|part|oem|numero/.test(t));
    tomar("numeroPieza", (t) => /codigo|cod\b|ref/.test(t));
    tomar("descripcion", (t) => /descrip|nombre|detalle/.test(t));
    tomar("marca", (t) => /marca|brand|fabric/.test(t));
    tomar("pais", (t) => /pais|origen|country/.test(t));
    tomar("precio", (t) => /precio|price|costo/.test(t));
    tomar("disponible", (t) => /dispon|exist|stock|cant|qty/.test(t));
    return col;
}

/** Qué encabezado es cada dato (para recordarlo con la lista). */
export function nombresColumnas(encabezados: Celda[], col: Columnas): Partial<Record<Campo, string>> {
    const r: Partial<Record<Campo, string>> = {};
    for (const campo of Object.keys(col) as Campo[]) {
        const i = col[campo];
        if (i != null && encabezados[i] != null) r[campo] = String(encabezados[i]);
    }
    return r;
}

function numero(v: Celda): number | null {
    if (v == null || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    let s = String(v).replace(/[^\d.,-]/g, "");
    // 1.234,56 → 1234.56 · 1,234.56 → 1234.56 · 12,5 → 12.5
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
    const n = Number(s);
    return isFinite(n) ? n : null;
}

/** Artículos de la lista: solo filas con número de pieza y precio mayor que cero. */
export function extraerArticulos(filas: Celda[][], encabezado: number, col: Columnas): ArticuloLista[] {
    const texto = (fila: Celda[], c: number | null) => {
        if (c == null) return null;
        const v = fila[c];
        return v == null || String(v).trim() === "" ? null : String(v).trim();
    };
    const articulos: ArticuloLista[] = [];
    for (const fila of filas.slice(encabezado + 1)) {
        const pieza = texto(fila, col.numeroPieza);
        const precio = col.precio == null ? null : numero(fila[col.precio]);
        if (!pieza || precio == null || precio <= 0) continue;
        articulos.push({
            codigo: texto(fila, col.codigo), numeroPieza: pieza, descripcion: texto(fila, col.descripcion),
            marca: texto(fila, col.marca), pais: texto(fila, col.pais), precio,
            disponible: col.disponible == null ? null : numero(fila[col.disponible]),
        });
    }
    return articulos;
}
