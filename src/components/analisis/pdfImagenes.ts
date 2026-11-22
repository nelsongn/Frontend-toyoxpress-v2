// PDF con una imagen JPG por página, armado a mano (sin librerías): el JPG va tal cual dentro del
// PDF (filtro DCTDecode), así que pesa lo mismo que las imágenes y se ve igual.

const texto = new TextEncoder();

/** Bytes de un data URL ("data:image/jpeg;base64,…"). */
export function bytesDeDataUrl(url: string): Uint8Array {
    const binario = atob(url.slice(url.indexOf(",") + 1));
    const r = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) r[i] = binario.charCodeAt(i);
    return r;
}

/**
 * PDF con una imagen por página, estirada a toda la hoja de w×h puntos (A4 = 595×842).
 * Todas las imágenes deben tener el mismo tamaño en píxeles.
 */
export function pdfDeImagenes(jpegs: Uint8Array[], anchoPx: number, altoPx: number, w: number, h: number): Blob {
    const partes: Uint8Array[] = [];
    let largo = 0;
    const offsets: number[] = [];
    const agregar = (d: string | Uint8Array) => {
        const b = typeof d === "string" ? texto.encode(d) : d;
        partes.push(b);
        largo += b.length;
    };
    const objeto = (num: number, ...cuerpo: (string | Uint8Array)[]) => {
        offsets[num] = largo;
        agregar(`${num} 0 obj\n`);
        for (const c of cuerpo) agregar(c);
        agregar("\nendobj\n");
    };

    // Encabezado con un comentario binario para que los lectores lo traten como binario
    agregar("%PDF-1.4\n");
    agregar(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    // 1: catálogo · 2: páginas · por cada página: página, contenido e imagen
    const pagina = (i: number) => 3 + i * 3;
    objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objeto(2, `<< /Type /Pages /Kids [${jpegs.map((_, i) => `${pagina(i)} 0 R`).join(" ")}] /Count ${jpegs.length} >>`);
    jpegs.forEach((jpg, i) => {
        const p = pagina(i);
        objeto(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
        const dibujo = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
        objeto(p + 1, `<< /Length ${dibujo.length} >>\nstream\n${dibujo}\nendstream`);
        objeto(p + 2,
            `<< /Type /XObject /Subtype /Image /Width ${anchoPx} /Height ${altoPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,
            jpg, "\nendstream");
    });

    // Tabla de referencias cruzadas
    const total = 3 + jpegs.length * 3;
    const xref = largo;
    agregar(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let n = 1; n < total; n++) agregar(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
    agregar(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(partes as BlobPart[], { type: "application/pdf" });
}
