"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Settings, Save, AlertCircle, CalendarRange, Sun, Moon, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import Swal from "sweetalert2";
import RequirePermission from "@/components/auth/RequirePermission";

interface DiaHorario {
    dia: string;
    cerrado: boolean;
    apertura: string;
    cierre: string;
}

export default function ConfiguracionPage() {
    const token = useAuthStore((state) => state.token);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    const [horario, setHorario] = useState<DiaHorario[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get(`${backendUrl}/configuracion`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data.data;
            if (data.horario) setHorario(data.horario);
            // temaLocal is now managed by next-themes, no need to set it from backend here
            // if (data.temaLocal) setTemaLocal(data.temaLocal);
        } catch (error) {
            console.error("Error cargando configuración:", error);
            Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleHorarioChange = (index: number, field: keyof DiaHorario, value: any) => {
        const newHorario = [...horario];
        newHorario[index] = { ...newHorario[index], [field]: value };
        setHorario(newHorario);
    };

    const handleCopyMonday = () => {
        if (horario.length === 0) return;

        // Asumiendo que Lunes es el index 0
        const monday = horario[0];

        const newHorario = horario.map((dia, idx) => {
            // No copiamos al propio Lunes (0) ni al Domingo (usualmente cerrado)
            // Edit: La petición dice "todos los horarios", aunque por prudencia suele no copiarse a Domingo,
            // pero si él lo pide, copiamos del Martes(1) al Domingo(6)
            if (idx === 0) return dia;
            return {
                ...dia,
                cerrado: monday.cerrado,
                apertura: monday.apertura,
                cierre: monday.cierre
            };
        });

        setHorario(newHorario);

        Swal.fire({
            icon: 'success',
            title: 'Horario Copiado',
            text: 'El horario del Lunes se ha aplicado a toda la semana.',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    };

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            await axios.put(`${backendUrl}/configuracion`,
                { horario, temaLocal: theme },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'Configuración actualizada correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire('Error', 'Fallo al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleTheme = (val: boolean) => {
        setTheme(val ? 'dark' : 'light');
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>;
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Configuración General</h1>
            </div>

            {/* Tema Visual */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                    <Sun className="h-5 w-5 text-amber-500" />
                    <h2 className="text-xl font-semibold">Aspecto Visual</h2>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 bg-muted/30 p-4 rounded-md gap-4">
                    <div>
                        <p className="font-medium">Modo Oscuro</p>
                        <p className="text-sm text-muted-foreground">Cambia los colores de la aplicación para entornos con poca luz.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Sun className="h-4 w-4" /> Claro
                        </span>
                        <Switch
                            checked={mounted ? (theme === 'dark' || resolvedTheme === 'dark') : false}
                            onCheckedChange={toggleTheme}
                        />
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                            Oscuro <Moon className="h-4 w-4" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Horarios */}
            <RequirePermission perm="horasIngreso">
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-4 gap-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            <h2 className="text-xl font-semibold">Horario de Operaciones</h2>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleCopyMonday} className="gap-2">
                            <Copy className="h-4 w-4" />
                            Repetir Lunes a toda la semana
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                        Define las horas en las que los vendedores podrán usar la plataforma.
                        Fuera de estas horas, el acceso estará bloqueado.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Headers (Desktop only) */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-sm font-semibold text-muted-foreground">
                            <div className="col-span-3">Día</div>
                            <div className="col-span-2 text-center">Estatus</div>
                            <div className="col-span-3 text-center">Apertura</div>
                            <div className="col-span-3 text-center">Cierre</div>
                        </div>

                        {horario.map((diaInfo, idx) => (
                            <div key={idx} className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-lg border ${diaInfo.cerrado ? 'bg-muted/50 border-dashed' : 'bg-background'}`}>
                                <div className="col-span-3 font-medium flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${diaInfo.cerrado ? 'bg-destructive' : 'bg-emerald-500'}`}></span>
                                    {diaInfo.dia}
                                </div>

                                <div className="col-span-2 flex justify-center items-center gap-2">
                                    <span className="text-xs text-muted-foreground uppercase">{diaInfo.cerrado ? 'Cerrado' : 'Abierto'}</span>
                                    <Switch
                                        checked={!diaInfo.cerrado}
                                        onCheckedChange={(val: boolean) => handleHorarioChange(idx, 'cerrado', !val)}
                                    />
                                </div>

                                <div className="col-span-3 flex items-center justify-center gap-2">
                                    <span className="md:hidden text-xs text-muted-foreground w-16">Apertura:</span>
                                    <Input
                                        type="time"
                                        value={diaInfo.apertura}
                                        onChange={(e) => handleHorarioChange(idx, 'apertura', e.target.value)}
                                        disabled={diaInfo.cerrado}
                                        className="w-full md:w-32"
                                    />
                                </div>

                                <div className="col-span-3 flex items-center justify-center gap-2">
                                    <span className="md:hidden text-xs text-muted-foreground w-16">Cierre:</span>
                                    <Input
                                        type="time"
                                        value={diaInfo.cierre}
                                        onChange={(e) => handleHorarioChange(idx, 'cierre', e.target.value)}
                                        disabled={diaInfo.cerrado}
                                        className="w-full md:w-32"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </RequirePermission>

            <div className="flex justify-end mt-4 pb-12">
                <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>
        </div>
    );
}
