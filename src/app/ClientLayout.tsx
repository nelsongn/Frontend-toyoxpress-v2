"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Loader2 } from "lucide-react";

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
