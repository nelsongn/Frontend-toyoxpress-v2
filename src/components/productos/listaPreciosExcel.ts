import * as XLSX from "xlsx";

/**
 * Excel de la lista de precios con colores y negrita.
 *
 * El xlsx (SheetJS) del proyecto no escribe estilos, así que el libro se arma a mano (XML de Office Open)
 * y se empaqueta con el ZIP que trae SheetJS (XLSX.CFB). Una sola hoja, con la fila de títulos fija y filtro.
 */

export type EstadoPrecio = "liquidacion" | "nuevo" | null;
export type EstiloResaltado = "texto" | "fondo";

export interface ArticuloLista {
    codigo: string;
    nombre: string;
    modelo: string | null;
    existencia: number;
    oferta: number | null;
    mayor: number | null;
    minimo: number | null;
    estado: EstadoPrecio;
}

export interface OpcionesLista {
    estilo: EstiloResaltado;
    /** Fecha de los datos (aaaa-mm-dd) */
    datosAl: string;
    descuento: number;
    mesesNuevo: number;
}

export const COLUMNAS_LISTA = ["Código", "Nombre", "Modelo", "Existencia", "Precio oferta", "Precio mayor", "Precio mínimo"];
const ANCHOS = [18, 70, 20, 11, 14, 14, 14];
const LETRAS = "ABCDEFG";

// Estilos (índices de cellXfs en styles.xml). Por fila: [texto, existencia, precio].
const XF_TITULO = 1, XF_NOTA = 2, XF_CABECERA = 3;
const XF_FILA: Record<EstiloResaltado, Record<"normal" | "liquidacion" | "nuevo", [number, number, number]>> = {
    texto: { normal: [4, 5, 6], liquidacion: [7, 8, 9], nuevo: [10, 11, 12] },
    fondo: { normal: [4, 5, 6], liquidacion: [13, 14, 15], nuevo: [16, 17, 18] },
};

// Fuentes: 0 normal, 1 título, 2 nota gris, 3 cabecera blanca, 4 rojo negrita, 5 azul negrita
// Rellenos: 0 y 1 obligatorios, 2 rojo de la marca (cabecera), 3 rojo claro, 4 azul claro
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts>
<fonts count="6">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FFA51C30"/><name val="Calibri"/></font>
<font><sz val="9"/><color rgb="FF595959"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFC00000"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF1F4E9F"/><name val="Calibri"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFA51C30"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFD9D9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9E7F7"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="19">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="1" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="1" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="1" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="5" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="1" fontId="5" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="5" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const TIPOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const LIBRO = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Lista de precios" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Lista de precios'!$A$4:$G$FIN</definedName></definedNames>
</workbook>`;

const RELS_LIBRO = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const escapar = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        // Caracteres de control que no admite XML
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const celdaTexto = (ref: string, texto: string, s: number) =>
    `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escapar(texto)}</t></is></c>`;
const celdaNumero = (ref: string, n: number | null, s: number) =>
    n == null ? `<c r="${ref}" s="${s}"/>` : `<c r="${ref}" s="${s}"><v>${n}</v></c>`;

export function fechaCorta(iso: string): string {
    const [a, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${a}`;
}

/** Texto de la leyenda, el mismo en Excel y PDF. */
export function leyendaLista(o: OpcionesLista): { rojo: string; azul: string } {
    return {
        rojo: `Piezas de liquidación (compradas hace 12 meses o más): precio con ${o.descuento} % de descuento`,
        azul: `Piezas nuevas (llegaron en los últimos ${o.mesesNuevo} meses)`,
    };
}

export function excelListaPrecios(articulos: ArticuloLista[], o: OpcionesLista): Blob {
    const ley = leyendaLista(o);
    const filas: string[] = [];
    filas.push(`<row r="1">${celdaTexto("A1", "ToyoXpress · Lista de precios", XF_TITULO)}</row>`);
    filas.push(`<row r="2">${celdaTexto("A2", `Precios en dólares · existencia al ${fechaCorta(o.datosAl)} · ${articulos.length} repuestos`, XF_NOTA)}</row>`);
    const marca = o.estilo === "texto" ? "En rojo" : "Fondo rojo";
    const marcaAzul = o.estilo === "texto" ? "En azul" : "Fondo azul";
    filas.push(`<row r="3">${celdaTexto("A3", `${marca}: ${ley.rojo}. ${marcaAzul}: ${ley.azul}.`, XF_NOTA)}</row>`);
    filas.push(`<row r="4">${COLUMNAS_LISTA.map((c, i) => celdaTexto(`${LETRAS[i]}4`, c, XF_CABECERA)).join("")}</row>`);

    articulos.forEach((a, i) => {
        const r = i + 5;
        const [t, e, p] = XF_FILA[o.estilo][a.estado ?? "normal"];
        filas.push(
            `<row r="${r}">` +
            celdaTexto(`A${r}`, a.codigo, t) +
            celdaTexto(`B${r}`, a.nombre, t) +
            celdaTexto(`C${r}`, a.modelo ?? "", t) +
            celdaNumero(`D${r}`, a.existencia, e) +
            celdaNumero(`E${r}`, a.oferta, p) +
            celdaNumero(`F${r}`, a.mayor, p) +
            celdaNumero(`G${r}`, a.minimo, p) +
            `</row>`
        );
    });

    const ultima = Math.max(4, articulos.length + 4);
    const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${ANCHOS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${filas.join("")}</sheetData>
<autoFilter ref="A4:G${ultima}"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
</worksheet>`;

    const cfb = XLSX.CFB;
    const zip = cfb.utils.cfb_new();
    const texto = new TextEncoder();
    const agregar = (ruta: string, xml: string) => cfb.utils.cfb_add(zip, ruta, texto.encode(xml));
    agregar("[Content_Types].xml", TIPOS);
    agregar("_rels/.rels", RELS);
    agregar("xl/workbook.xml", LIBRO.replace("$FIN", () => `$${ultima}`));
    agregar("xl/_rels/workbook.xml.rels", RELS_LIBRO);
    agregar("xl/styles.xml", ESTILOS);
    agregar("xl/worksheets/sheet1.xml", hoja);
    const datos: Uint8Array = cfb.write(zip, { fileType: "zip", type: "array", compression: true });
    return new Blob([new Uint8Array(datos)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
