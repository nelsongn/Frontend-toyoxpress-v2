"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import { Activity, AlertCircle, ArrowRight, ArrowLeftRight, ShoppingCart, ContactRound, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstadoSincronizacion } from "@/components/dashboard/EstadoSincronizacion";
import { CajaHoy } from "@/components/dashboard/CajaHoy";
import { UltimosMovimientos, UltimosPedidos } from "@/components/dashboard/ListasRecientes";
import { SaldosCuentas } from "@/components/dashboard/SaldosCuentas";
import type { DashboardStats } from "@/components/dashboard/tipos";
import { horaCaracas } from "@/lib/horario";

// Columnas de abajo: el grid las estira a la misma altura y la última tarjeta de cada una
// crece para llenarla, así los bordes inferiores quedan al mismo nivel.
const COLUMNA_INFERIOR = "flex flex-col gap-4 [&>*:last-child]:flex-1";

function saludo(hora: number) {
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const nombre = useAuthStore((state) => state.name);
  const permisos = useAuthStore((state) => state.permissions);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Hora de referencia para el saludo y la fecha (Caracas)
  const [ahora] = useState(() => Date.now());

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información del dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Activity className="h-5 w-5 animate-pulse" /> Cargando panel...
        </span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] text-destructive">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> {error}
        </span>
      </div>
    );
  }

  const hora = horaCaracas(ahora);
  const puedeRegistrarMovimiento = permisos?.verMovimientos === true;
  const puedeVender = stats.puedeVerPedidos;
  const verSincronizacion = !!stats.sincronizacion && (stats.puedeVerPedidos || permisos?.cargarProductos === true);
  const columnaDerecha = stats.puedeVerCuentas || verSincronizacion;

  return (
    <div className="space-y-6">
      {/* Encabezado: título, saludo con fecha de Caracas y accesos rápidos */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {stats.esAdmin ? "Dashboard general" : "Mi resumen diario"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {saludo(hora.horas)}{nombre ? `, ${nombre}` : ""} · {hora.dia} {hora.fecha}, hora de Caracas
          </p>
        </div>
        {(puedeRegistrarMovimiento || puedeVender) && (
          <div className="flex flex-wrap gap-2">
            {puedeRegistrarMovimiento && (
              <Button asChild variant="outline">
                <Link href="/movimientos?nuevo=1">
                  <ArrowLeftRight className="h-4 w-4" />
                  Registrar movimiento
                </Link>
              </Button>
            )}
            {puedeVender && (
              <Button asChild>
                <Link href="/pedidos">
                  <ShoppingCart className="h-4 w-4" />
                  Nueva venta
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Fila superior: caja de hoy, pendientes + catálogo */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.puedeVerMovimientos && (
          <CajaHoy ingresos={stats.financiero.ingresosHoy} egresos={stats.financiero.egresosHoy} />
        )}

        <div className="grid content-start gap-4">
          {stats.esAdmin && (
            <section aria-label="Pendientes por aprobar" className="rounded-lg border border-border border-l-4 border-l-amber-500 bg-card p-5 shadow-sm">
              <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{stats.pendientesAprobar}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {stats.pendientesAprobar === 1 ? "Movimiento pendiente por aprobar" : "Movimientos pendientes por aprobar"}
                </p>
                {puedeRegistrarMovimiento && stats.pendientesAprobar > 0 && (
                  <Link href="/movimientos" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">
                    Revisar
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </section>
          )}

          <section aria-label="Catálogo" className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <ContactRound className="h-4 w-4" aria-hidden="true" /> Clientes
                </dt>
                <dd className="font-mono font-semibold tabular-nums text-foreground">{stats.catalogo.totalClientes.toLocaleString("es-VE")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" aria-hidden="true" /> Productos
                </dt>
                <dd className="font-mono font-semibold tabular-nums text-foreground">{stats.catalogo.totalProductos.toLocaleString("es-VE")}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* Actividad reciente (izquierda) y saldos + sincronización (derecha) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(stats.puedeVerPedidos || stats.puedeVerMovimientos) && (
          <div className={`${COLUMNA_INFERIOR} ${columnaDerecha ? "lg:col-span-2" : "lg:col-span-3"}`}>
            {stats.puedeVerPedidos && <UltimosPedidos pedidos={stats.recientes.pedidos} />}
            {stats.puedeVerMovimientos && <UltimosMovimientos movimientos={stats.recientes.movimientos} />}
          </div>
        )}

        {columnaDerecha && (
          <div className={`${COLUMNA_INFERIOR} ${stats.puedeVerPedidos || stats.puedeVerMovimientos ? "" : "lg:col-span-3"}`}>
            {stats.puedeVerCuentas && (
              <SaldosCuentas
                cuentas={stats.cuentas}
                total={permisos?.verSaldoTotal === true ? stats.financiero.saldoTotal : null}
              />
            )}
            {verSincronizacion && stats.sincronizacion && (
              <EstadoSincronizacion
                datos={stats.sincronizacion}
                verPedidos={stats.puedeVerPedidos}
                verProductos={permisos?.cargarProductos === true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
