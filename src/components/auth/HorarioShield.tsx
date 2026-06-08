"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import Swal from 'sweetalert2';

interface HorarioData {
    dia: string;
    cerrado: boolean;
    apertura: string;
    cierre: string;
}

export default function HorarioShield({ children }: { children: React.ReactNode }) {
    const { token, permissions, logout } = useAuthStore() as any;
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const alertedWarningRef = useRef(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        // Limpiar intervalo previo si cambia authToken o Path
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
        }

        const isAuthRoute = pathname === '/login';

        // Si no estamos logueados, o estamos en login, o poseemos el permiso especial, no hacemos nada
        if (!token || isAuthRoute || permissions?.obviarIngreso) {
            return;
        }

        // Función que descarga la hora y evalúa
        const evaluarHorario = async () => {
            try {
                const res = await api.get('/configuracion');

                const schedule: HorarioData[] = res.data.data.horario;
                const serverTimeMs = res.data.serverTimeMs;

                // Create a Date object corresponding to the exact moment in Caracas
                // We will just use the returned string from backend and parse it reliably
                // "3/11/2026, 7:22:15 AM" style string provided by 'es-VE' toLocaleString
                // To circumvent parsing issues, let's just use the server ms directly along with client Date math

                // Since we need to know the current hour/minute in Caracas, we ask JS to convert it:
                const serverDate = new Date(serverTimeMs);
                const formatter = new Intl.DateTimeFormat('es-VE', {
                    timeZone: 'America/Caracas',
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                const parts = formatter.formatToParts(serverDate);

                let currentDayStr = '';
                let currentHour = 0;
                let currentMin = 0;
                let currentSec = 0;

                for (const part of parts) {
                    if (part.type === 'weekday') currentDayStr = part.value;
                    if (part.type === 'hour') currentHour = parseInt(part.value, 10);
                    if (part.type === 'minute') currentMin = parseInt(part.value, 10);
                    if (part.type === 'second') currentSec = parseInt(part.value, 10);
                }

                currentHour = currentHour === 24 ? 0 : currentHour;

                const dayMap: Record<string, string> = {
                    'lunes': 'Lunes', 'martes': 'Martes', 'miércoles': 'Miércoles',
                    'jueves': 'Jueves', 'viernes': 'Viernes', 'sábado': 'Sábado', 'domingo': 'Domingo'
                };
                const dayKey = dayMap[currentDayStr.toLowerCase()] || 'Lunes';

                const todaySchedule = schedule.find(h => h.dia === dayKey);

                if (!todaySchedule) return;

                if (todaySchedule.cerrado) {
                    doLogout("La tienda se encuentra cerrada el día de hoy.");
                    return;
                }

                const [openH, openM] = todaySchedule.apertura.split(':').map(Number);
                const [closeH, closeM] = todaySchedule.cierre.split(':').map(Number);

                const nowMsIntoDay = ((currentHour * 60) + currentMin) * 60000 + (currentSec * 1000);
                const openMsIntoDay = ((openH * 60) + openM) * 60000;
                const closeMsIntoDay = ((closeH * 60) + closeM) * 60000;

                // Lógica simple para cerrar (aplica mejor al mismo día)
                const isOvernight = closeMsIntoDay < openMsIntoDay;
                let isOpen = false;

                if (isOvernight) {
                    isOpen = nowMsIntoDay >= openMsIntoDay || nowMsIntoDay <= closeMsIntoDay;
                } else {
                    isOpen = nowMsIntoDay >= openMsIntoDay && nowMsIntoDay <= closeMsIntoDay;
                }

                if (!isOpen) {
                    doLogout(`La tienda opera de ${todaySchedule.apertura} a ${todaySchedule.cierre}. Vuelva en ese horario.`);
                    return;
                }

                // Calculamos cuánto falta para el cierre en MS
                let msToClose = 0;
                if (isOvernight) {
                    if (nowMsIntoDay <= closeMsIntoDay) {
                        msToClose = closeMsIntoDay - nowMsIntoDay;
                    } else {
                        // is before midnight, closing is tomorrow
                        msToClose = (86400000 - nowMsIntoDay) + closeMsIntoDay;
                    }
                } else {
                    msToClose = closeMsIntoDay - nowMsIntoDay;
                }

                // Si faltan <= 5 min (300,000 ms) y no hemos avisado
                if (msToClose <= 300000 && msToClose > 0 && !alertedWarningRef.current) {
                    alertedWarningRef.current = true;
                    Swal.fire({
                        icon: 'warning',
                        title: '¡Cierre próximo!',
                        text: 'El sistema se desconectará automáticamente en menos de 5 minutos.',
                        toast: true,
                        position: 'top-end',
                        timer: 10000,
                        showConfirmButton: false
                    });
                }

            } catch (error) {
                console.error("HorarioShield Error fetching config", error);
            }
        };

        const doLogout = (reason: string) => {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: reason,
                confirmButtonText: 'Entendido'
            }).then(() => {
                logout();
                router.push('/login');
            });
        };

        // Ejecutar inmediatamente
        evaluarHorario();

        // Validar cada 30 segundos
        checkIntervalRef.current = setInterval(() => {
            evaluarHorario();
        }, 30000);

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        };

    }, [isClient, token, permissions, pathname, router, logout]);

    if (!isClient) return null;

    return <>{children}</>;
}
