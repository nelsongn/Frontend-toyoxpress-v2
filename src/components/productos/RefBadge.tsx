import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// REF = ubicación del producto en bodega (ej. 06-02-D01).
// Sin modificadores de opacidad (bg-primary/5, etc.): Tailwind v4 los compila con
// color-mix(), que Chrome < 111 (Windows 7) no soporta y los pinta como color sólido.
export function RefBadge({ value, className }: { value: string; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded border border-border border-l-2 border-l-primary bg-muted px-1.5 py-0.5 font-sans text-xs font-semibold text-foreground whitespace-nowrap", className)}>
            <MapPin className="h-3 w-3 text-primary dark:text-red-400" aria-hidden="true" />
            <span className="font-normal text-muted-foreground">REF</span>{value}
        </span>
    );
}
