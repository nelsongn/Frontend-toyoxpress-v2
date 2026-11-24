import React from "react";
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "@/lib/constants/logo";
import { fechaCorta, leyendaLista, type ArticuloLista, type OpcionesLista } from "./listaPreciosExcel";

// PDF de la lista de precios (texto real, se puede buscar y copiar). Mismas reglas de color que el Excel.

const ROJO = "#c00000";
const AZUL = "#1f4e9f";
const FONDO_ROJO = "#ffd9d9";
const FONDO_AZUL = "#d9e7f7";
const MARCA = "#a51c30";

const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 7, paddingTop: 92, paddingBottom: 44, paddingHorizontal: 24, color: "#1e293b" },
    header: { position: "absolute", top: 18, left: 24, right: 24 },
    headerFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 6, borderBottomWidth: 1.5, borderBottomColor: MARCA },
    logo: { width: 120, height: 36, objectFit: "contain" },
    titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", color: MARCA, textAlign: "right" },
    meta: { fontSize: 7, color: "#64748b", marginTop: 2, textAlign: "right" },
    thFila: { flexDirection: "row", backgroundColor: MARCA, paddingVertical: 4, paddingHorizontal: 3, marginTop: 6 },
    th: { fontSize: 6.5, color: "#ffffff", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
    fila: { flexDirection: "row", paddingVertical: 2.5, paddingHorizontal: 3, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
    par: { backgroundColor: "#f8fafc" },
    cCodigo: { width: "15%", paddingRight: 3 },
    cNombre: { width: "45%", paddingRight: 3 },
    cModelo: { width: "13%", paddingRight: 3 },
    cExist: { width: "6%", textAlign: "right", paddingRight: 3 },
    cPrecio: { width: "7%", textAlign: "right" },
    footer: { position: "absolute", bottom: 14, left: 24, right: 24, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 4 },
    leyenda: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
    muestra: { width: 8, height: 6, marginRight: 4 },
    pieTexto: { fontSize: 6.5, color: "#64748b" },
});

const dinero = (n: number | null) =>
    n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ListaPreciosDocument({ articulos, opciones }: { articulos: ArticuloLista[]; opciones: OpcionesLista }) {
    const fondo = opciones.estilo === "fondo";
    const ley = leyendaLista(opciones);

    // Estilo de la fila y del texto según el estado del repuesto
    const estiloFila = (a: ArticuloLista, i: number) => {
        if (fondo && a.estado === "liquidacion") return { backgroundColor: FONDO_ROJO };
        if (fondo && a.estado === "nuevo") return { backgroundColor: FONDO_AZUL };
        return i % 2 ? s.par : {};
    };
    const estiloTexto = (a: ArticuloLista) =>
        a.estado === "liquidacion" ? { color: ROJO, fontFamily: "Helvetica-Bold" }
            : a.estado === "nuevo" ? { color: AZUL, fontFamily: "Helvetica-Bold" }
                : {};
    const muestra = (estado: "liquidacion" | "nuevo") =>
        fondo
            ? { backgroundColor: estado === "liquidacion" ? FONDO_ROJO : FONDO_AZUL }
            : { backgroundColor: estado === "liquidacion" ? ROJO : AZUL };

    return (
        <Document title="Lista de precios ToyoXpress" author="ToyoXpress">
            <Page size="A4" style={s.page}>
                <View style={s.header} fixed>
                    <View style={s.headerFila}>
                        <Image src={LOGO_BASE64} style={s.logo} />
                        <View>
                            <Text style={s.titulo}>LISTA DE PRECIOS</Text>
                            <Text style={s.meta}>Precios en dólares · existencia al {fechaCorta(opciones.datosAl)} · {articulos.length} repuestos</Text>
                        </View>
                    </View>
                    <View style={s.thFila}>
                        <Text style={[s.th, s.cCodigo]}>Código</Text>
                        <Text style={[s.th, s.cNombre]}>Nombre</Text>
                        <Text style={[s.th, s.cModelo]}>Modelo</Text>
                        <Text style={[s.th, s.cExist]}>Exist.</Text>
                        <Text style={[s.th, s.cPrecio]}>Oferta</Text>
                        <Text style={[s.th, s.cPrecio]}>Mayor</Text>
                        <Text style={[s.th, s.cPrecio]}>Mínimo</Text>
                    </View>
                </View>

                {articulos.map((a, i) => {
                    const t = estiloTexto(a);
                    return (
                        <View key={a.codigo} style={[s.fila, estiloFila(a, i)]} wrap={false}>
                            <Text style={[s.cCodigo, t]}>{a.codigo}</Text>
                            <Text style={[s.cNombre, t]}>{a.nombre}</Text>
                            <Text style={[s.cModelo, t]}>{a.modelo || "—"}</Text>
                            <Text style={[s.cExist, t]}>{a.existencia}</Text>
                            <Text style={[s.cPrecio, t]}>{dinero(a.oferta)}</Text>
                            <Text style={[s.cPrecio, t]}>{dinero(a.mayor)}</Text>
                            <Text style={[s.cPrecio, t]}>{dinero(a.minimo)}</Text>
                        </View>
                    );
                })}

                <View style={s.footer} fixed>
                    <View style={s.leyenda}>
                        <View style={[s.muestra, muestra("liquidacion")]} />
                        <Text style={[s.pieTexto, { color: ROJO, fontFamily: "Helvetica-Bold" }]}>{ley.rojo}</Text>
                    </View>
                    <View style={[s.leyenda, { justifyContent: "space-between" }]}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={[s.muestra, muestra("nuevo")]} />
                            <Text style={[s.pieTexto, { color: AZUL, fontFamily: "Helvetica-Bold" }]}>{ley.azul}</Text>
                        </View>
                        <Text style={s.pieTexto} render={({ pageNumber, totalPages }) => `ToyoXpress · Página ${pageNumber} de ${totalPages}`} />
                    </View>
                </View>
            </Page>
        </Document>
    );
}
