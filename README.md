# ToyoXpress v2 - E-commerce & Inventory Management Dashboard

### **Frontend Empresarial para Gestión Omnicanal y Sincronización en Tiempo Real**

Este repositorio contiene la aplicación cliente (SPA/SSR) para el ecosistema **ToyoXpress v2**. Desarrollada con **Next.js (App Router)** y **TypeScript**, esta interfaz actúa como el panel de control centralizado para la administración multialmacén, facturación, y el monitoreo de sincronización asíncrona de inventarios hacia WooCommerce.

---

## 🚀 Retos de Ingeniería y Soluciones Aplicadas

El desarrollo de interfaces para sistemas de gestión de inventario (ERP/WMS) requiere manejar flujos de datos complejos y estados asíncronos. En este proyecto se aplicaron principios de **Ingeniería de Requisitos** e **Interacción Humano-Computadora (UX)** para resolver operaciones críticas:

* **Traducción de Reglas de Negocio a UI:** Implementación de componentes de control de acceso paramétrico como `HorarioShield.tsx` y `RequirePermission.tsx`. Estos actúan como una capa de seguridad en el cliente que restringe operativamente transacciones (ej. ventas físicas) fuera de los horarios comerciales establecidos o según la jerarquía del rol.
* **Manejo de Estados Asíncronos Complejos (UX/UI):** La sincronización masiva de catálogos hacia WooCommerce es un proceso que toma tiempo. Para no bloquear la operativa del usuario, se diseñaron componentes reactivos (`GlobalSyncProgress.tsx` y `SyncDashboard.tsx`) que proporcionan *feedback* visual en tiempo real sobre el estado de las colas de procesamiento (AWS SQS) en el backend.
* **Arquitectura de Componentes Escalable:** Uso del patrón de diseño atómico, apoyado en la biblioteca de primitivas de **shadcn/ui** y **Tailwind CSS**. Esto permitió crear un sistema de diseño coherente con componentes reutilizables (`DataTable`, `Dialogs`, `Forms`) que aceleran el desarrollo de nuevos módulos corporativos.
* **Gestión de Carga Cognitiva:** Diseño de interfaces de punto de venta (POS) y carritos de compra integrados (`VentaForm.tsx`, `CartTable.tsx`) optimizados para operaciones rápidas en sucursal, minimizando los clics necesarios para procesar un pedido físico y descontar stock simultáneamente.

---

## 🛠️ Stack Tecnológico

* **Framework Core:** [Next.js](https://nextjs.org/) (App Router) optimizando el rendimiento mediante Server Components y Client Components estratégicos.
* **Lenguaje:** **TypeScript** estricto para garantizar la integridad de los contratos de datos entre el cliente y la API REST.
* **Estilos y UI:** [Tailwind CSS](https://tailwindcss.com/) complementado con componentes accesibles (ARIA) para un diseño responsivo y profesional.
* **Gestión del Estado Global:** Implementación de *stores* personalizados (`useAuthStore.ts`) para el manejo persistente de sesiones (JWT) y perfiles de usuario.
* **Despliegue Continuo (CI/CD):** Pipelines integrados mediante GitHub Actions y configuración nativa en **Vercel** para despliegues de alta disponibilidad.

---

## 📦 Módulos Principales

* **📦 Módulo de Inventario y Movimientos:** Tablas dinámicas (`ProductsTable`, `MovesTable`) para la trazabilidad de entradas, salidas y transferencias entre cuentas/almacenes.
* **🛒 Módulo POS (Punto de Venta) y Pedidos:** Interfaz fluida para la creación de ventas locales, generación dinámica de comprobantes (`PedidoDocument.tsx`) y control de estados de preparación.
* **🔄 Dashboard de Sincronización:** Panel de telemetría visual para auditar fallos de sincronización con WooCommerce y forzar reintentos individuales o masivos.
* **👥 Gestión de Usuarios y Clientes:** ABM (Alta, Baja, Modificación) avanzado con modales asíncronos y validación de datos en tiempo real.

---

## ⚙️ Configuración y Desarrollo Local

### Requisitos Previos
* Node.js 18+
* Gestor de paquetes: npm, pnpm o yarn
* [Backend ToyoXpress API v2](https://github.com/mdemedina/backend-toyoxpress-v2) corriendo localmente o en AWS.

### Instalación

1. Clonar el repositorio:
```bash
git clone [https://github.com/mdemedina/frontend-toyoxpress-v2.git](https://github.com/mdemedina/frontend-toyoxpress-v2.git)
cd frontend-toyoxpress-v2
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar las variables de entorno (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api  # O la URL de tu instancia en AWS EC2
```

4. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```

### Compilación y Despliegue en Vercel
El proyecto está optimizado para Edge Networks. Cada *push* a la rama `main` ejecuta un proceso de *build* (`npm run build`) validando la consistencia de tipos en TypeScript y sintaxis mediante ESLint antes de liberar la versión a producción.

---

## 🏗️ Topología del Proyecto (App Router)

```text
src/
├── app/                  # Sistema de enrutamiento basado en archivos (Next.js 13+)
│   ├── (auth)/           # Rutas públicas (Login)
│   ├── (dashboard)/      # Rutas protegidas (Inventario, Pedidos, Movimientos)
│   └── layout.tsx        # Layout maestro y providers (Autenticación, Tema)
├── components/           # Componentes aislados y reutilizables
│   ├── auth/             # Escudos de acceso (RequirePermission, HorarioShield)
│   ├── layout/           # Estructura (Sidebar, Header, MapModal)
│   ├── ui/               # Primitivas de diseño base (Botones, Inputs, Tablas)
│   └── [domain]/         # Componentes específicos por dominio (productos, pedidos)
└── lib/                  # Utilidades globales
    ├── api.ts            # Cliente HTTP pre-configurado (Axios/Fetch) con interceptores
    └── store/            # Gestores de estado global
```
