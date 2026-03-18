import axios from 'axios';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Swal from 'sweetalert2';

// URL base del nuevo backend (puedes ajustarla desde .env)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
// Derived base URL (without /api) for static assets
export const BASE_URL = API_URL.replace(/\/api$/, '');

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para inyectar el token en cada petición automáticamente
api.interceptors.request.use(
    (config) => {
        // Obtenemos el token directamente del estado global de Zustand
        const token = useAuthStore.getState().token;

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas (Ej. expiración de token o bloqueos de horario)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Si el servidor responde 401 Unauthorized, limpiamos estado y redirigimos
            useAuthStore.getState().logout();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        } else if (error.response?.status === 403) {
            // Evaluamos si el body dice algo sobre el cierre o tienda
            const msg = error.response.data?.message || '';
            if (msg.toLowerCase().includes('tienda')) {
                useAuthStore.getState().logout();
                if (typeof window !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Fuera de Horario Laboral',
                        text: msg,
                        confirmButtonText: 'Cerrar Sesión'
                    }).then(() => {
                        window.location.href = '/login';
                    });
                }
            }
        }
        return Promise.reject(error);
    }
);
