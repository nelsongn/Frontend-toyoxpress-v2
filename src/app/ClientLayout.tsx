"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { token, _hasHydrated } = useAuthStore();
    const isAuthPage = pathname === "/login";

    useEffect(() => {
        if (!_hasHydrated) return;

        if (!token && !isAuthPage) {
            router.push("/login");
        } else if (token && isAuthPage) {
            router.push("/");
        }
    }, [token, isAuthPage, _hasHydrated, router]);

    // Helper to extract JWT expiration time in milliseconds
    const getJwtExpiry = (jwtToken: string | null): number | null => {
        if (!jwtToken) return null;
        try {
            const parts = jwtToken.split('.');
            if (parts.length !== 3) return null;
            const payload = JSON.parse(
                atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
            );
            return payload.exp ? payload.exp * 1000 : null;
        } catch {
            return null;
        }
    };

    // JWT EXPIRATION AUTO-LOGOUT: Schedules timer and listens for mobile wake/tab switch events
    useEffect(() => {
        if (!token || isAuthPage) return;

        const logout = useAuthStore.getState().logout;

        const checkTokenExpiration = () => {
            const exp = getJwtExpiry(token);
            if (!exp) return false;

            const now = Date.now();
            if (now >= exp) {
                console.warn("Session expired (JWT reached expiration time). Logging out.");
                logout();
                router.push("/login");
                return true;
            }
            return false;
        };

        // 1. Initial check immediately
        const expired = checkTokenExpiration();
        if (expired) return;

        // 2. Schedule timeout for exact expiration moment
        const exp = getJwtExpiry(token);
        let timeoutId: NodeJS.Timeout | null = null;
        if (exp) {
            const delay = exp - Date.now();
            if (delay > 0) {
                timeoutId = setTimeout(() => {
                    console.warn("Session expired automatically via JWT timer.");
                    logout();
                    router.push("/login");
                }, delay);
            }
        }

        // 3. Listen to focus and visibility change events (robust for mobile sleep/wake)
        const handleActivity = () => {
            checkTokenExpiration();
        };

        window.addEventListener("focus", handleActivity);
        document.addEventListener("visibilitychange", handleActivity);

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener("focus", handleActivity);
            document.removeEventListener("visibilitychange", handleActivity);
        };
    }, [token, isAuthPage, router]);

    // SESSION HEARTBEAT: Checks token expiration and store schedule on the backend every 60 seconds
    useEffect(() => {
        if (!token || isAuthPage) return;

        // Perform check
        const checkSession = async () => {
            try {
                await api.get('/auth/verify');
            } catch (error) {
                // Interceptor in @/lib/api.ts will handle 401/403 and redirect
                console.warn("Session check failed, handling via interceptor");
            }
        };

        const interval = setInterval(checkSession, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, [token, isAuthPage]);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Show loading screen while hydration is in progress
    if (!_hasHydrated) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Cargando sistema...</p>
                </div>
            </div>
        );
    }

    if (isAuthPage) {
        return <main className="flex-1 w-full h-full">{children}</main>;
    }

    // If not logged in and not on auth page, show nothing while redirecting
    if (!token && !isAuthPage) {
        return null;
    }

    return (
        <div className="flex h-[100dvh] w-full bg-background overflow-hidden relative">
            {/* Overlay para móvil */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity" 
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar con comportamiento responsive */}
            <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 md:relative md:translate-x-0`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-muted/30">
                    {children}
                </main>
            </div>
        </div>
    );
}
