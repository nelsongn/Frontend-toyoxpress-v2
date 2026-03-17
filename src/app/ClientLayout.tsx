"use client";

import { useEffect } from "react";
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
        <>
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-8 bg-muted/30">
                    {children}
                </main>
            </div>
        </>
    );
}
