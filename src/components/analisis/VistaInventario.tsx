"use client";

import { cn } from "@/lib/utils";
import { RefBadge } from "@/components/productos/RefBadge";
import { BarrasMes } from "./BarrasMes";
import { BarraCelda, EstadoCarga, FilaKpis, Kpi, Panel, Tabla, td, tdCodigo, tdNum, th, thNum, useAnalitica } from "./Bloques";
import { decimal, fecha, num, pct, usd } from "./formato";

interface Bloque { productos: number; venta: number; valorStock: number }
interface Sku {
    codigo: string; nombre: string; familia: string | null; ref: string | null; stock: number; venta: number;
    margen: number; clientes: number; meses: number; valorStock: number; cobertura: number | null; ultimaVenta: string | null;
}
interface Sugerido {
    codigo: string; nombre: string; familia: string | null; proveedor: string | null; stock: number;
    ventaMes: number; unidades: number; inversion: number; margenEsperado: number; motor: boolean;
}
interface Datos {
    periodo: { desde: string; hasta: string; coberturaDias: number };
    resumen: {
        valorStock: number; productosConStock: number; productosVendidos: number; venta: number; margen: number;
        margenPorDolar: number | null; rotacion: number | null; motorSinStock: number; motorTotal: number;
    };
    abc: { A: Bloque; B: Bloque; C: Bloque; sinVenta: Bloque };
    dormido: Bloque & { sobreStock: Bloque };
    motor: Sku[];
    capitalDormido: Sku[];
    compraSugerida: { productos: number; inversion: number; margenEsperado: number; lista: Sugerido[] };
    familias: { nombre: string; venta: number; margen: number; valorStock: number; margenPorDolar: number | null; rotacion: number | null }[];
    compras: { mensual: { mes: string; total: number; facturas: number }[]; proveedores: { nombre: string; total: number; facturas: number; ultima: string }[] };
}

const GRUPOS_ABC: { clave: keyof Datos["abc"]; nombre: string; ayuda: string }[] = [
    { clave: "A", nombre: "A", ayuda: "80 % de la venta" },
    { clave: "B", nombre: "B", ayuda: "siguiente 15 %" },
    { clave: "C", nombre: "C", ayuda: "último 5 %" },
    { clave: "sinVenta", nombre: "Sin venta", ayuda: "nada en 12 meses" },
];

export function VistaInventario() {
    const { datos, error, cargando } = useAnalitica<Datos>("inventario");
    if (!datos || cargando || error) return <EstadoCarga cargando={cargando} error={error} />;

    const { resumen: r, abc, dormido, compraSugerida: cs } = datos;
    const totalVenta = GRUPOS_ABC.reduce((s, g) => s + abc[g.clave].venta, 0) || 1;
    const totalStock = GRUPOS_ABC.reduce((s, g) => s + abc[g.clave].valorStock, 0) || 1;
    const maxFamilia = Math.max(...datos.familias.map((f) => f.margenPorDolar ?? 0), 0);
    const maxProveedor = Math.max(...datos.compras.proveedores.map((p) => p.total), 0);
    const parado = dormido.valorStock + dormido.sobreStock.valorStock;

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Venta de {fecha(datos.periodo.desde)} al {fecha(datos.periodo.hasta)} · stock de hoy a costo promedio</p>

            <FilaKpis>
                <Kpi titulo="Inventario a costo" valor={usd(r.valorStock)} detalle={`${num(r.productosConStock)} repuestos con stock`} />
                <Kpi
                    titulo="Margen por $ en stock"
                    valor={decimal(r.margenPorDolar, 2)}
                    detalle={`rota ${decimal(r.rotacion)} veces al año`}
                />
                <Kpi
                    titulo="Más vendidos en cero"
                    valor={`${num(r.motorSinStock)} de ${num(r.motorTotal)}`}
                    detalle="repuestos clave sin stock hoy"
                    alerta={r.motorSinStock > 0}
                />
                <Kpi
                    titulo="Dinero parado"
                    valor={usd(parado)}
                    detalle={`${pct(r.valorStock ? parado / r.valorStock : 0)} del inventario`}
                    alerta={parado > r.valorStock * 0.3}
                />
            </FilaKpis>

            <Panel titulo="Dónde está la venta y dónde está el inventario" detalle="Clasificación ABC por venta de los últimos 12 meses.">
                <Tabla>
                    <thead><tr><th className={th}>Grupo</th><th className={thNum}>Repuestos</th><th className={thNum}>% de la venta</th><th className={thNum}>% del inventario</th><th className={thNum}>Inventario</th></tr></thead>
                    <tbody>
                        {GRUPOS_ABC.map((g) => (
                            <tr key={g.clave}>
                                <td className={td}><span className="font-semibold">{g.nombre}</span> <span className="text-xs text-muted-foreground">{g.ayuda}</span></td>
                                <td className={tdNum}>{num(abc[g.clave].productos)}</td>
                                <td className={tdNum}><BarraCelda valor={abc[g.clave].venta} maximo={totalVenta} texto={pct(abc[g.clave].venta / totalVenta)} /></td>
                                <td className={tdNum}><BarraCelda valor={abc[g.clave].valorStock} maximo={totalStock} texto={pct(abc[g.clave].valorStock / totalStock)} tono={g.clave === "sinVenta" ? "rojo" : "primary"} /></td>
                                <td className={tdNum}>{usd(abc[g.clave].valorStock)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Tabla>
            </Panel>

            <Panel
                titulo={`Compra sugerida para ${datos.periodo.coberturaDias} días`}
                detalle={`${num(cs.productos)} repuestos que se venden con regularidad · inversión ${usd(cs.inversion)} al último costo · margen esperado ${usd(cs.margenEsperado)}. Ajustar al mínimo de pedido y al tiempo de entrega de cada proveedor.`}
            >
                <Tabla>
                    <thead><tr><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Stock</th><th className={thNum}>Vende / mes</th><th className={thNum}>Comprar</th><th className={thNum}>Inversión</th><th className={thNum}>Margen esp.</th><th className={th}>Proveedor</th></tr></thead>
                    <tbody>
                        {cs.lista.map((s) => (
                            <tr key={s.codigo}>
                                <td className={tdCodigo}>{s.codigo}</td>
                                <td className={cn(td, "min-w-[220px]")}>
                                    {s.nombre}
                                    {s.motor && <span className="ml-2 rounded-full border border-primary px-1.5 text-[10px] font-semibold text-primary dark:border-red-400 dark:text-red-400">clave</span>}
                                </td>
                                <td className={cn(tdNum, s.stock <= 0 && "text-red-600 dark:text-red-400")}>{num(s.stock)}</td>
                                <td className={tdNum}>{decimal(s.ventaMes)}</td>
                                <td className={cn(tdNum, "font-semibold")}>{num(s.unidades)}</td>
                                <td className={tdNum}>{usd(s.inversion)}</td>
                                <td className={tdNum}>{usd(s.margenEsperado)}</td>
                                <td className={cn(td, "text-xs text-muted-foreground")}>{s.proveedor ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Tabla>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Repuestos clave" detalle="Del 80 % de la venta y vendidos en 6 meses o más. Primero los que están en cero.">
                    <Tabla>
                        <thead><tr><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Venta 12 m</th><th className={thNum}>Clientes</th><th className={thNum}>Stock</th></tr></thead>
                        <tbody>
                            {datos.motor.map((s) => (
                                <tr key={s.codigo}>
                                    <td className={tdCodigo}>{s.codigo}{s.ref && <span className="mt-1 block"><RefBadge value={s.ref} /></span>}</td>
                                    <td className={cn(td, "min-w-[200px]")}>{s.nombre}</td>
                                    <td className={tdNum}>{usd(s.venta)}</td>
                                    <td className={tdNum}>{num(s.clientes)}</td>
                                    <td className={cn(tdNum, "font-semibold", s.stock <= 0 && "text-red-600 dark:text-red-400")}>{s.stock <= 0 ? "Sin stock" : num(s.stock)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>

                <Panel
                    titulo="Dinero parado"
                    detalle={`Sin ventas en 12 meses: ${usd(dormido.valorStock)} en ${num(dormido.productos)} repuestos. Stock para más de 15 meses: ${usd(dormido.sobreStock.valorStock)} en ${num(dormido.sobreStock.productos)}.`}
                >
                    <Tabla>
                        <thead><tr><th className={th}>Código</th><th className={th}>Repuesto</th><th className={thNum}>Stock</th><th className={thNum}>A costo</th><th className={thNum}>Alcanza para</th></tr></thead>
                        <tbody>
                            {datos.capitalDormido.map((s) => (
                                <tr key={s.codigo}>
                                    <td className={tdCodigo}>{s.codigo}</td>
                                    <td className={cn(td, "min-w-[200px]")}>{s.nombre}<span className="block text-xs text-muted-foreground">Última venta: {fecha(s.ultimaVenta)}</span></td>
                                    <td className={tdNum}>{num(s.stock)}</td>
                                    <td className={tdNum}>{usd(s.valorStock)}</td>
                                    <td className={cn(tdNum, "whitespace-nowrap")}>{s.cobertura == null ? "sin ventas" : `${decimal(s.cobertura / 365)} años`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>

            <Panel titulo="Familias: cuánto rinde cada dólar en stock" detalle="Margen de los últimos 12 meses dividido por el inventario de hoy a costo.">
                <Tabla>
                    <thead><tr><th className={th}>Familia</th><th className={thNum}>Venta 12 m</th><th className={thNum}>Margen</th><th className={thNum}>Rotación</th><th className={thNum}>Margen por $ en stock</th><th className={thNum}>Stock a costo</th></tr></thead>
                    <tbody>
                        {datos.familias.map((f) => (
                            <tr key={f.nombre}>
                                <td className={td}>{f.nombre}</td>
                                <td className={tdNum}>{usd(f.venta)}</td>
                                <td className={tdNum}>{pct(f.venta ? f.margen / f.venta : 0)}</td>
                                <td className={tdNum}>{f.rotacion == null ? "—" : `${decimal(f.rotacion)}×`}</td>
                                <td className={tdNum}><BarraCelda valor={f.margenPorDolar ?? 0} maximo={maxFamilia} texto={decimal(f.margenPorDolar, 2)} /></td>
                                <td className={tdNum}>{usd(f.valorStock)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Tabla>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel titulo="Compras por mes">
                    <BarrasMes
                        etiqueta="Compras"
                        puntos={datos.compras.mensual.map((m) => ({ mes: m.mes, valor: m.total, detalle: [`${num(m.facturas)} facturas de compra`] }))}
                    />
                </Panel>
                <Panel titulo="Compras por proveedor" detalle="Últimos 12 meses.">
                    <Tabla>
                        <thead><tr><th className={th}>Proveedor</th><th className={thNum}>Comprado</th><th className={thNum}>Facturas</th><th className={thNum}>Última</th></tr></thead>
                        <tbody>
                            {datos.compras.proveedores.map((p) => (
                                <tr key={p.nombre}>
                                    <td className={td}>{p.nombre}</td>
                                    <td className={tdNum}><BarraCelda valor={p.total} maximo={maxProveedor} texto={usd(p.total)} /></td>
                                    <td className={tdNum}>{num(p.facturas)}</td>
                                    <td className={cn(tdNum, "whitespace-nowrap text-xs")}>{fecha(p.ultima)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Tabla>
                </Panel>
            </div>
        </div>
    );
}
