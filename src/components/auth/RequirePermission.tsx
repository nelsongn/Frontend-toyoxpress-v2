'use client';

import React from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { tienePermiso } from '@/lib/permissions';

interface RequirePermissionProps {
    /** Un permiso, o una lista: basta con tener uno de ellos. */
    perm: string | string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function RequirePermission({ perm, children, fallback = null }: RequirePermissionProps) {
    const permissions = useAuthStore((state) => state.permissions);

    // If the user has the permission (or any of them), render children
    // Otherwise, render nothing (or the fallback)
    if (tienePermiso(permissions, perm)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
