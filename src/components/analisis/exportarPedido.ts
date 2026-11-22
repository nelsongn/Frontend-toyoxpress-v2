// Excel del pedido. Dos versiones:
// - Para el proveedor: con SU código y número de pieza (como el modelo que se le manda a Japan:
//   código, número de pieza, descripción, marca, país, precio, cantidad y total), sin nuestros códigos.
// - Interno: con nuestros códigos, prioridad, stock y margen (para revisarlo en la oficina).

export interface ArticuloProveedor {
    codigo?: string | null; numeroPieza?: string | null; descripcion?: string | null;
    marca?: string | null; pais?: string | null; revisar?: boolean;
}
export interface LineaParaProveedor {
    codigo: string; nombre: string; cantidad: number; costo: number; articulo?: ArticuloProveedor | null;
}

const limpiarNombre = (s: string) => s.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");

/** Excel en el formato del proveedor. Las líneas sin equivalencia salen con el número Toyota y marcadas para revisar. */
export async function excelParaProveedor(lineas: LineaParaProveedor[], proveedor: string, fecha: string, numeroPedido?: string) {
    const XLSX = await import("xlsx");
    const conCantidad = lineas.filter((l) => l.cantidad > 0);
    const hayCodigo = conCantidad.some((l) => l.articulo?.codigo);
    const hayRevisar = conCantidad.some((l) => l.articulo?.revisar || !l.articulo);
    const filas = conCantidad.map((l) => {
        const a = l.articulo ?? {};
        const fila: Record<string, string | number> = {};
        if (hayCodigo) fila["Código"] = a.codigo ?? "";
        fila["Número de pieza"] = a.numeroPieza ?? l.codigo;
        fila["Descripción"] = a.descripcion ?? l.nombre;
        fila["Marca"] = a.marca ?? "";
        fila["País"] = a.pais ?? "";
        fila["Precio"] = l.costo;
        fila["Cantidad"] = l.cantidad;
        fila["Total"] = Number((l.costo * l.cantidad).toFixed(2));
        if (hayRevisar) fila["Revisar"] = a.revisar || !l.articulo ? "Sin equivalencia: confirmar número" : "";
        return fila;
    });
    const total = conCantidad.reduce((s, l) => s + l.costo * l.cantidad, 0);
    const hoja = XLSX.utils.json_to_sheet(filas);
    // Fila de total al final, en la columna Total
    const columnas = Object.keys(filas[0] ?? {});
    const colTotal = columnas.indexOf("Total");
    if (colTotal >= 0) XLSX.utils.sheet_add_aoa(hoja, [[]], { origin: -1 });
    if (colTotal >= 0) XLSX.utils.sheet_add_aoa(hoja, [[...Array(colTotal).fill(""), Number(total.toFixed(2))]], { origin: -1 });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedido");
    XLSX.writeFile(libro, `Pedido_${limpiarNombre(proveedor)}_${numeroPedido ? `${numeroPedido}_` : ""}${fecha}.xlsx`);
}
