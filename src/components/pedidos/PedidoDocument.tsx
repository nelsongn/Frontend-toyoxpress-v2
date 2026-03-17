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

interface Cliente {
    Nombre: string;
    Rif: string;
    Telefonos?: string;
    "Correo Electronico"?: string;
    Ciudad?: string;
    Direccion?: string;
    "Tipo de Precio"?: string;
}

interface LineaPedido {
    codigo: string;
    nombre: string;
    marca?: string;
    referencia?: string;
    cantidad: number | "";
    precio: number;
    total: number;
}

interface PedidoDocumentProps {
    cliente: Cliente;
    lineas: LineaPedido[];
    total: number;
    notaPedido?: string;
    vendedor: string;
    hora: string;
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

    /* ── Client & Info block ── */
    infoBlock: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 14,
    },
    infoBox: {
        flex: 1,
        backgroundColor: "#f8fafc",
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: "#e2e8f0",
        padding: 8,
    },
    infoBoxTitle: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 5,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 2,
    },
    infoLabel: {
        fontSize: 7.5,
        color: "#64748b",
        width: 70,
    },
    infoValue: {
        fontSize: 7.5,
        color: "#0f172a",
        flex: 1,
        fontFamily: "Helvetica-Bold",
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
        paddingVertical: 4,
        paddingHorizontal: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: "#e2e8f0",
    },
    tableRowEven: {
        backgroundColor: "#f8fafc",
    },

    /* Column widths */
    colCodigo: { width: "13%", paddingRight: 4 },
    colNombre: { width: "38%", paddingRight: 4 },
    colMarca: { width: "14%", paddingRight: 4 },
    colCantidad: { width: "9%", textAlign: "center" },
    colPU: { width: "12%", textAlign: "right", paddingRight: 4 },
    colTotal: { width: "14%", textAlign: "right" },

    thText: {
        fontSize: 7,
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    tdText: {
        fontSize: 7.5,
        color: "#1e293b",
    },
    tdTextMuted: {
        fontSize: 7,
        color: "#64748b",
    },

    /* ── Totals ── */
    totalsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 6,
        gap: 20,
    },
    totalChip: {
        alignItems: "center",
        backgroundColor: "#f1f5f9",
        borderRadius: 4,
        padding: 6,
        minWidth: 80,
    },
    totalChipHighlight: {
        backgroundColor: "#0f172a",
    },
    totalChipLabel: {
        fontSize: 6.5,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    totalChipLabelLight: {
        color: "#94a3b8",
    },
    totalChipValue: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    totalChipValueLight: {
        color: "#ffffff",
    },

    /* ── Nota ── */
    notaBox: {
        marginTop: 14,
        borderWidth: 0.5,
        borderColor: "#e2e8f0",
        borderRadius: 3,
        padding: 8,
    },
    notaTitle: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    notaText: {
        fontSize: 8,
        color: "#334155",
        lineHeight: 1.5,
    },

    /* ── Footer ── */
    footer: {
        position: "absolute",
        bottom: 16,
        left: 28,
        right: 28,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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

export function PedidoDocument({
    cliente,
    lineas,
    total,
    notaPedido,
    vendedor,
    hora,
}: PedidoDocumentProps) {
    const totalItems = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ─── Header ──────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Image src={LOGO_BASE64} style={styles.logo} />
                    <View style={styles.headerRight}>
                        <Text style={styles.docTitle}>PEDIDO</Text>
                        <Text style={styles.docMeta}>Fecha: {hora}</Text>
                        <Text style={styles.docMeta}>Vendedor: {vendedor}</Text>
                    </View>
                </View>

                {/* ─── Info Block (Cliente) ─────────────────────────────── */}
                <View style={styles.infoBlock}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoBoxTitle}>Datos del Cliente</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Razón Social:</Text>
                            <Text style={styles.infoValue}>{cliente.Nombre}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>RIF:</Text>
                            <Text style={styles.infoValue}>{cliente.Rif}</Text>
                        </View>
                        {cliente.Telefonos ? (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Teléfono:</Text>
                                <Text style={styles.infoValue}>{cliente.Telefonos}</Text>
                            </View>
                        ) : null}
                        {cliente["Correo Electronico"] ? (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Correo:</Text>
                                <Text style={styles.infoValue}>{cliente["Correo Electronico"]}</Text>
                            </View>
                        ) : null}
                        {cliente.Ciudad ? (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Ciudad:</Text>
                                <Text style={styles.infoValue}>{cliente.Ciudad}</Text>
                            </View>
                        ) : null}
                        {cliente["Tipo de Precio"] ? (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tipo de Precio:</Text>
                                <Text style={styles.infoValue}>{cliente["Tipo de Precio"]}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* ─── Table ───────────────────────────────────────────── */}
                <View style={styles.table}>
                    {/* Head */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.colCodigo]}>Código</Text>
                        <Text style={[styles.thText, styles.colNombre]}>Descripción</Text>
                        <Text style={[styles.thText, styles.colMarca]}>Marca</Text>
                        <Text style={[styles.thText, styles.colCantidad]}>Cant.</Text>
                        <Text style={[styles.thText, styles.colPU]}>P.U. $</Text>
                        <Text style={[styles.thText, styles.colTotal]}>Total $</Text>
                    </View>

                    {/* Rows */}
                    {lineas.map((l, i) => (
                        <View
                            key={i}
                            style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowEven : {}]}
                        >
                            <Text style={[styles.tdTextMuted, styles.colCodigo]}>{l.codigo}</Text>
                            <Text style={[styles.tdText, styles.colNombre]}>{l.nombre}</Text>
                            <Text style={[styles.tdTextMuted, styles.colMarca]}>{l.marca || "—"}</Text>
                            <Text style={[styles.tdText, styles.colCantidad]}>{Number(l.cantidad) || 0}</Text>
                            <Text style={[styles.tdText, styles.colPU]}>{l.precio.toFixed(2)}</Text>
                            <Text style={[styles.tdText, styles.colTotal]}>{l.total.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* ─── Totals ──────────────────────────────────────────── */}
                <View style={styles.totalsRow}>
                    <View style={styles.totalChip}>
                        <Text style={styles.totalChipLabel}>Líneas</Text>
                        <Text style={styles.totalChipValue}>{lineas.length}</Text>
                    </View>
                    <View style={styles.totalChip}>
                        <Text style={styles.totalChipLabel}>Items</Text>
                        <Text style={styles.totalChipValue}>{totalItems}</Text>
                    </View>
                    <View style={[styles.totalChip, styles.totalChipHighlight]}>
                        <Text style={[styles.totalChipLabel, styles.totalChipLabelLight]}>Total</Text>
                        <Text style={[styles.totalChipValue, styles.totalChipValueLight]}>
                            ${total.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* ─── Nota ────────────────────────────────────────────── */}
                {notaPedido ? (
                    <View style={styles.notaBox}>
                        <Text style={styles.notaTitle}>Nota del Pedido</Text>
                        <Text style={styles.notaText}>{notaPedido}</Text>
                    </View>
                ) : null}

                {/* ─── Footer ──────────────────────────────────────────── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>TOYOXPRESS — Repuestos y Accesorios</Text>
                    <Text style={styles.footerText}>Documento generado el {hora}</Text>
                </View>
            </Page>
        </Document>
    );
}
