// Display de 7 segmentos (estilo reloj LED), dibujado en SVG: sin fuentes externas y nítido a
// cualquier tamaño. Funciona en Chrome 109 (Windows 7).

// Los segmentos toman el color del texto (currentColor), así se ven bien en tema claro y oscuro
// directamente sobre el fondo del card; los apagados apenas se insinúan.
const OPACIDAD_APAGADO = 0.07;

type Segmento = "a" | "b" | "c" | "d" | "e" | "f" | "g";

const DIGITOS: Record<string, Segmento[]> = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "g", "e", "d"],
    "3": ["a", "b", "g", "c", "d"],
    "4": ["f", "g", "b", "c"],
    "5": ["a", "f", "g", "c", "d"],
    "6": ["a", "f", "g", "e", "d", "c"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"],
};

// Dígito en una caja de 60×100: segmentos hexagonales de 10 de grosor
const horizontal = (y: number) => `12,${y} 17,${y - 5} 43,${y - 5} 48,${y} 43,${y + 5} 17,${y + 5}`;
const vertical = (x: number, y1: number, y2: number) => `${x},${y1} ${x + 5},${y1 + 5} ${x + 5},${y2 - 5} ${x},${y2} ${x - 5},${y2 - 5} ${x - 5},${y1 + 5}`;

const SEGMENTOS: Record<Segmento, string> = {
    a: horizontal(7),
    g: horizontal(50),
    d: horizontal(93),
    f: vertical(8, 10, 47),
    b: vertical(52, 10, 47),
    e: vertical(8, 53, 90),
    c: vertical(52, 53, 90),
};

function Digito({ valor }: { valor: string }) {
    const encendidos = DIGITOS[valor] ?? [];
    return (
        <g>
            {(Object.keys(SEGMENTOS) as Segmento[]).map((s) => (
                <polygon key={s} points={SEGMENTOS[s]} fill="currentColor" fillOpacity={encendidos.includes(s) ? 1 : OPACIDAD_APAGADO} />
            ))}
        </g>
    );
}

function DosPuntos({ encendido }: { encendido: boolean }) {
    return (
        <g fill="currentColor" fillOpacity={encendido ? 1 : OPACIDAD_APAGADO}>
            <rect x="4" y="28" width="10" height="10" rx="2" />
            <rect x="4" y="62" width="10" height="10" rx="2" />
        </g>
    );
}

interface Props {
    horas: number;
    minutos: number;
    /** Los dos puntos parpadean: encendidos en segundos pares (el reloj se ve en marcha) */
    segundos: number;
    /** Altura de los dígitos en px (48 = el alto del reloj de texto text-5xl que había antes) */
    alto?: number;
}

// Inicio de cada pieza en el viewBox: dígitos de 60 de ancho con 8 de separación
const X_DIGITOS = [0, 68, 150, 218];
const X_PUNTOS = 128;
const ANCHO = 218 + 60 + 12; // último dígito + margen para la inclinación

/** "HH:MM" en estilo LED de 7 segmentos, con los dos puntos parpadeando cada segundo. */
export function DisplayLed({ horas, minutos, segundos, alto = 48 }: Props) {
    const hh = String(horas).padStart(2, "0");
    const mm = String(minutos).padStart(2, "0");
    const digitos = hh + mm;

    return (
        <div role="img" aria-label={`${hh}:${mm}`} className="inline-flex text-foreground">
            <svg viewBox={`0 0 ${ANCHO} 100`} height={alto} width={(alto * ANCHO) / 100} aria-hidden="true">
                {/* Inclinación leve, como los relojes LED */}
                <g transform="skewX(-6) translate(6 0)">
                    {X_DIGITOS.map((x, i) => (
                        <g key={x} transform={`translate(${x} 0)`}>
                            <Digito valor={digitos[i]} />
                        </g>
                    ))}
                    <g transform={`translate(${X_PUNTOS} 0)`}>
                        <DosPuntos encendido={segundos % 2 === 0} />
                    </g>
                </g>
            </svg>
        </div>
    );
}
