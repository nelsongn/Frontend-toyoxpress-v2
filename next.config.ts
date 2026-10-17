import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "Configuración" pasó a llamarse "Horarios" (solo tenía el horario de ingreso)
  async redirects() {
    return [{ source: "/configuracion", destination: "/horarios", permanent: false }];
  },
};

export default nextConfig;
