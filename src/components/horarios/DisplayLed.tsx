// Display de 7 segmentos (estilo reloj LED), dibujado en SVG: sin fuentes externas y nítido a
// cualquier tamaño. Funciona en Chrome 109 (Windows 7).

// Color del LED encendido y del segmento apagado (blanco sobre negro)
const LED_ENCENDIDO = "#f5f5f5";
const LED_APAGADO = "#1c1c1c";

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
                <polygon key={s} points={SEGMENTOS[s]} fill={encendidos.includes(s) ? LED_ENCENDIDO : LED_APAGADO} />
            ))}
        </g>
    );
}

function DosPuntos({ encendido }: { encendido: boolean }) {
    return (
        <g fill={encendido ? LED_ENCENDIDO : LED_APAGADO}>
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
    /** Altura de los dígitos en px */
    alto?: number;
}

// Inicio de cada pieza en el viewBox: dígitos de 60 de ancho con 8 de separación
const X_DIGITOS = [0, 68, 150, 218];
const X_PUNTOS = 128;
const ANCHO = 218 + 60 + 12; // último dígito + margen para la inclinación

/** "HH:MM" en estilo LED de 7 segmentos, con los dos puntos parpadeando cada segundo. */
export function DisplayLed({ horas, minutos, segundos, alto = 64 }: Props) {
    const hh = String(horas).padStart(2, "0");
    const mm = String(minutos).padStart(2, "0");
    const digitos = hh + mm;

    return (
        <div
            role="img"
            aria-label={`${hh}:${mm}`}
            className="inline-flex rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3"
            // Brillo del LED encendido
            style={{ filter: `drop-shadow(0 0 4px ${LED_ENCENDIDO}66)` }}
        >
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
