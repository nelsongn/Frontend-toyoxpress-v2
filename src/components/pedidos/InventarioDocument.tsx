import React from "react";
import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";
import { LOGO_BASE64 } from "@/lib/constants/logo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductoLinea {
    codigo: string;
    nombre: string;
    marca?: string;
    referencia?: string;
    stock: number;
    precio: number;
    precioMayor: number;
    precioOferta: number;
}

interface InventarioDocumentProps {
    productos: ProductoLinea[];
    hora: string;
    filtros?: {
        search?: string;
        marca?: string;
        soloConStock?: boolean;
    };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        paddingTop: 24,
        paddingBottom: 32,
        paddingHorizontal: 28,
        backgroundColor: "#ffffff",
    },

    /* ── Header ── */
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1.5,
        borderBottomColor: "#1a1a1a",
        paddingBottom: 10,
        marginBottom: 12,
    },
    logo: {
        width: 160,
        height: 48,
        objectFit: "contain",
    },
    headerRight: {
        alignItems: "flex-end",
    },
    docTitle: {
        fontSize: 15,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    docMeta: {
        fontSize: 7.5,
        color: "#64748b",
        marginTop: 3,
    },

    /* ── Filtros badge ── */
    filtrosBadge: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 5,
        marginBottom: 10,
    },
    chip: {
        backgroundColor: "#f1f5f9",
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontSize: 7,
        color: "#475569",
    },

    /* ── Table ── */
    table: {
        marginBottom: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#0f172a",
        borderRadius: 3,
        paddingVertical: 5,
        paddingHorizontal: 4,
        marginBottom: 1,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 3,
        paddingHorizontal: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: "#e2e8f0",
    },
    tableRowEven: {
        backgroundColor: "#f8fafc",
    },
    tableRowNoStock: {
        opacity: 0.5,
    },

    colCodigo: { width: "13%", paddingRight: 4 },
    colNombre: { width: "32%", paddingRight: 4 },
    colMarca: { width: "13%", paddingRight: 4 },
    colStock: { width: "6%", textAlign: "center" },
    colPrecio: { width: "12%", textAlign: "right" },
    colPrecioMayor: { width: "12%", textAlign: "right" },
    colPrecioOferta: { width: "12%", textAlign: "right" },

    thText: {
        fontSize: 7,
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    tdText: { fontSize: 7, color: "#1e293b" },
    tdTextMuted: { fontSize: 6.5, color: "#64748b" },
    tdRed: { fontSize: 7, color: "#dc2626", fontFamily: "Helvetica-Bold" },

    /* ── Summary ── */
    summary: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 6,
        gap: 12,
    },
    summaryChip: {
        backgroundColor: "#0f172a",
        borderRadius: 4,
        padding: 6,
        minWidth: 90,
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 6.5,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: "#ffffff",
    },

    /* ── Footer ── */
    footer: {
        position: "absolute",
        bottom: 16,
        left: 28,
        right: 28,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 0.5,
        borderTopColor: "#e2e8f0",
        paddingTop: 6,
    },
    footerText: {
        fontSize: 6.5,
        color: "#94a3b8",
    },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function InventarioDocument({ productos, hora, filtros }: InventarioDocumentProps) {
    const totalConStock = productos.filter(p => p.stock > 0).length;

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <Image src={LOGO_BASE64} style={styles.logo} />
                    <View style={styles.headerRight}>
                        <Text style={styles.docTitle}>INVENTARIO</Text>
                        <Text style={styles.docMeta}>Generado: {hora}</Text>
                        <Text style={styles.docMeta}>{productos.length} productos</Text>
                    </View>
                </View>

                {/* Filtros activos */}
                {(filtros?.search || filtros?.marca || filtros?.soloConStock) && (
                    <View style={styles.filtrosBadge}>
                        <Text style={[styles.chip, { fontFamily: "Helvetica-Bold" }]}>Filtros: </Text>
                        {filtros?.search && <Text style={styles.chip}>Búsqueda: "{filtros.search}"</Text>}
                        {filtros?.marca && <Text style={styles.chip}>Modelo: {filtros.marca}</Text>}
                        {filtros?.soloConStock && <Text style={styles.chip}>Solo con stock</Text>}
                    </View>
                )}

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.colCodigo]}>Código</Text>
                        <Text style={[styles.thText, styles.colNombre]}>Descripción</Text>
                        <Text style={[styles.thText, styles.colMarca]}>Modelo</Text>
                        <Text style={[styles.thText, styles.colStock]}>Stock</Text>
                        <Text style={[styles.thText, styles.colPrecio]}>Precio Mín</Text>
                        <Text style={[styles.thText, styles.colPrecioMayor]}>P. Mayor</Text>
                        <Text style={[styles.thText, styles.colPrecioOferta]}>P. Oferta</Text>
                    </View>

                    {productos.map((p, i) => (
                        <View
                            key={i}
                            style={[
                                styles.tableRow,
                                i % 2 !== 0 ? styles.tableRowEven : {},
                                p.stock === 0 ? styles.tableRowNoStock : {},
                            ]}
                        >
                            <Text style={[styles.tdTextMuted, styles.colCodigo]}>{p.codigo}</Text>
                            <Text style={[styles.tdText, styles.colNombre]}>{p.nombre}</Text>
                            <Text style={[styles.tdTextMuted, styles.colMarca]}>{p.marca || "—"}</Text>
                            <Text style={[p.stock > 0 ? styles.tdText : styles.tdRed, styles.colStock]}>
                                {p.stock}
                            </Text>
                            <Text style={[styles.tdText, styles.colPrecio]}>{p.precio.toFixed(2)}</Text>
                            <Text style={[styles.tdText, { color: "#2563eb" }, styles.colPrecioMayor]}>{p.precioMayor.toFixed(2)}</Text>
                            <Text style={[styles.tdText, { color: "#16a34a" }, styles.colPrecioOferta]}>{p.precioOferta.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View style={styles.summary}>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryLabel}>Total SKUs</Text>
                        <Text style={styles.summaryValue}>{productos.length}</Text>
                    </View>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryLabel}>Con Stock</Text>
                        <Text style={styles.summaryValue}>{totalConStock}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>TOYOXPRESS — Inventario de Productos</Text>
                    <Text style={styles.footerText}>{hora}</Text>
                </View>
            </Page>
        </Document>
    );
}
