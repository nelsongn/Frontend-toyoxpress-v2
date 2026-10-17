"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import { inicioPara } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginForm() {
    const router = useRouter();
    const setLogin = useAuthStore((state: any) => state.login);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Endpoint que haremos en Backend v2
            const res = await api.post("/auth/login", formData);

            setLogin(res.data.token, res.data.user);
            router.push(inicioPara(res.data.user?.permissions));
        } catch (err: any) {
            setError(err.response?.data?.message || "Error al conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border shadow-lg">
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Usuario / Correo</Label>
                        <Input
                            id="email"
                            type="text"
                            required
                            disabled={loading}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="admin@toyoxpress.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            disabled={loading}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {error && (
                        <div className="text-sm font-medium text-destructive">{error}</div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Cargando..." : "Ingresar"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
