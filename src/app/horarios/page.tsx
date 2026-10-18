"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Clock, Save } from "lucide-react";
import Swal from "sweetalert2";
import RequirePermission from "@/components/auth/RequirePermission";
import { RelojCaracas } from "@/components/horarios/RelojCaracas";
import { EditorHorario, formatoHoras, minutosAbierto } from "@/components/horarios/EditorHorario";
import type { DiaHorario } from "@/lib/horario";

export default function HorariosPage() {
    const token = useAuthStore((state) => state.token);

    const [horario, setHorario] = useState<DiaHorario[]>([]);
    // Último horario guardado (o cargado): para saber si hay cambios sin guardar y poder descartarlos
    const [guardado, setGuardado] = useState<DiaHorario[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // Hora del servidor − hora de este equipo: el reloj muestra la del servidor
    const [desfaseServidorMs, setDesfaseServidorMs] = useState<number | null>(null);

    // El tema claro/oscuro se cambia desde el Header (ThemeToggle)
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await api.get('/configuracion');
            const data = res.data.data;
            if (data.horario) {
                setHorario(data.horario);
                setGuardado(data.horario);
            }
            if (typeof res.data.serverTimeMs === "number") setDesfaseServidorMs(res.data.serverTimeMs - Date.now());
            // temaLocal is now managed by next-themes, no need to set it from backend here
            // if (data.temaLocal) setTemaLocal(data.temaLocal);
        } catch (error) {
            console.error("Error cargando configuración:", error);
            Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const hayCambios = JSON.stringify(horario) !== JSON.stringify(guardado);
    const minutosSemana = horario.reduce((total, d) => total + minutosAbierto(d), 0);

    // Avisar antes de salir de la página con cambios sin guardar
    useEffect(() => {
        if (!hayCambios) return;
        const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", avisar);
        return () => window.removeEventListener("beforeunload", avisar);
    }, [hayCambios]);

    const handleHorarioChange = (index: number, field: keyof DiaHorario, value: string | boolean) => {
        const newHorario = [...horario];
        newHorario[index] = { ...newHorario[index], [field]: value };
        setHorario(newHorario);
    };

    // Copia el horario del lunes a los demás días ABIERTOS (no abre días cerrados)
    const handleCopyMonday = () => {
        const lunes = horario.find((d) => d.dia === "Lunes");
        if (!lunes) return;
        const nuevo = horario.map((d) =>
            d.dia === "Lunes" || d.cerrado ? d : { ...d, apertura: lunes.apertura, cierre: lunes.cierre }
        );
        setHorario(nuevo);

        Swal.fire({
            icon: 'success',
            title: 'Horario copiado',
            text: `Se aplicó ${lunes.apertura} – ${lunes.cierre} a los días abiertos. Recuerda guardar.`,
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    };

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            await api.put('/configuracion', { horario });
            setGuardado(horario);
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'Horario actualizado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire('Error', 'Fallo al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando horarios...</div>;
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-6">
            <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Horarios</h1>
                    <p className="text-muted-foreground mt-1">Define en qué horario pueden ingresar los usuarios al sistema.</p>
                </div>
            </div>

            <RequirePermission perm="horasIngreso">
                <RelojCaracas horario={horario} desfaseServidorMs={desfaseServidorMs} />
            </RequirePermission>

            {/* Horario de ingreso */}
            <RequirePermission
                perm="horasIngreso"
                fallback={<p className="text-sm text-muted-foreground">No tienes permiso para configurar los horarios.</p>}
            >
                <EditorHorario
                    horario={horario}
                    onCambio={handleHorarioChange}
                    onCopiarLunes={handleCopyMonday}
                    desfaseServidorMs={desfaseServidorMs}
                />

                {/* Barra de guardado: queda fija abajo mientras se edita */}
                <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-mono font-semibold tabular-nums text-foreground">{formatoHoras(minutosSemana)}</span> por semana
                        {hayCambios && <span className="text-amber-600 dark:text-amber-400"> · Cambios sin guardar</span>}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setHorario(guardado)} disabled={!hayCambios || saving}>
                            Descartar
                        </Button>
                        <Button onClick={handleSave} disabled={!hayCambios || saving} className="gap-2">
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {saving ? "Guardando..." : "Guardar horario"}
                        </Button>
                    </div>
                </div>
            </RequirePermission>
        </div>
    );
}
