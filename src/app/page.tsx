"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight, ArrowDownLeft, DollarSign, Activity,
  Users, Package, TrendingUp, AlertCircle, ShoppingBag,
  Clock, CreditCard, ChevronRight, ArrowLeftRight
} from "lucide-react";

interface DashboardStats {
  ok: boolean;
  esAdmin: boolean;
  puedeVerCuentas: boolean;
  puedeVerMovimientos: boolean;
  puedeVerPedidos: boolean;
  financiero: {
    ingresosHoy: number;
    egresosHoy: number;
    saldoTotal: number;
  };
  catalogo: {
    totalClientes: number;
    totalProductos: number;
  };
  pendientesAprobar: number;
  cuentas: Array<{
    nombre: string;
    balance: number;
    color: string;
  }>;
  recientes: {
    pedidos: any[];
    movimientos: any[];
  };
}

export default function Dashboard() {
  const token = useAuthStore((state: any) => state.token);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        const res = await axios.get(`${backendUrl}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información del dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, backendUrl]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-VE', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {stats.esAdmin ? "Dashboard General" : "Mi Resumen Diario"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {stats.esAdmin
              ? "Resumen financiero y de operaciones del sistema de ToyoXpress."
              : "Resumen de tus operaciones de caja y pedidos procesados hoy."}
          </p>
        </div>
      </div>

      {/* Top Metrics row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Solos los Admins o los que ven Movimientos verán la suma total, pero los vendedores verán "sus ventas" */}
        {stats.puedeVerMovimientos && (
          <>
            <Card className="shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos (Hoy)</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stats.financiero.ingresosHoy)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Registrados en movimientos</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos (Hoy)</CardTitle>
                <ArrowDownLeft className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(stats.financiero.egresosHoy)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Salidas registradas</p>
              </CardContent>
            </Card>
          </>
        )}

        {stats.esAdmin ? (
          <Card className="shadow-sm border-border/60 bg-amber-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes por Aprobar</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-amber-600 mt-2">
                {stats.pendientesAprobar}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Movimientos sin verificar</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Worker SQS</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Activo</div>
              <p className="text-xs text-muted-foreground mt-1">Sincronización en línea</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-rows-2 gap-4">
          <Card className="shadow-sm border-border/60 flex items-center p-4">
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-4">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Clientes</p>
              <p className="text-xl font-bold">{stats.catalogo.totalClientes}</p>
            </div>
          </Card>
          <Card className="shadow-sm border-border/60 flex items-center p-4">
            <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-4">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Productos</p>
              <p className="text-xl font-bold">{stats.catalogo.totalProductos}</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Columna Principal: Actividades Recientes */}
        <div className={`space-y-6 ${stats.puedeVerCuentas ? 'md:col-span-8' : 'md:col-span-12'}`}>

          {/* Pedidos */}
          {stats.puedeVerPedidos && (
            <Card className="shadow-sm border-border/60 flex flex-col h-[350px]">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Últimos Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-auto flex-1">
                {stats.recientes.pedidos.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No hay pedidos recientes.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cliente / Vendedor</th>
                        <th className="px-4 py-2 text-center font-medium text-muted-foreground">Monto</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {stats.recientes.pedidos.map(p => (
                        <tr key={p._id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground truncate max-w-[200px]">
                            <div>{p.payload?.cliente?.Nombre || 'Desconocido'}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Vendedor: {p.vendedorName || p.vendedorId || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                            {formatCurrency(p.payload?.total || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                            {formatDate(p.creadoEn || p.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Movimientos */}
          {stats.puedeVerMovimientos && (
            <Card className="shadow-sm border-border/60 flex flex-col h-[350px]">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                  Últimos Movimientos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-auto flex-1">
                {stats.recientes.movimientos.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No hay movimientos registrados hoy.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Detalle</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {stats.recientes.movimientos.map(m => (
                        <tr key={m._id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground truncate max-w-[250px]">
                            {m.referencia}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${m.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {m.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Columna Secundaria: Distribución de Saldos (Solo Mánagers/Admins) */}
        {stats.puedeVerCuentas && (
          <div className="md:col-span-4 space-y-6">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Distribución de Saldos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {stats.cuentas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center my-6">No hay cuentas fiduciarias configuradas.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.cuentas.map(c => {
                      return (
                        <div key={c.nombre} className="space-y-1.5 py-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-foreground flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#94a3b8' }}></span>
                              {c.nombre}
                            </span>
                            <span className={`font-semibold ${c.balance < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                              {formatCurrency(c.balance)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pequeña tarjeta informativa de SQS para rellenar espacio lateral si hay saldos */}
            <Card className="shadow-sm border-border/60 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Worker SQS Activo</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Las operaciones locales se están replicando de manera asíncrona hacia los servidores de la nube.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
