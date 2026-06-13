import type { Color, EstadoPartida } from '@parchis/shared';
import { ANILLO, GARAJE, META, PASILLO, SALIDA, SEGUROS, VIEWBOX } from '../tablero/layout';
import { coordenadaFicha } from '../tablero/posicion';
import { COLOR_HEX } from '../tablero/colores';
import { Ficha } from './Ficha';

interface Props {
  estado: EstadoPartida;
  jugables: Set<number>;
  esMiTurno: boolean;
  miColor: Color | null;
  onMover: (fichaId: number) => void;
}

// Rotación del tablero para que cada jugador vea su garaje (y su brazo) abajo a la derecha.
const ANGULO_POR_COLOR: Record<Color, number> = { rojo: -90, azul: 0, amarillo: 90, verde: 180 };

const RADIO_ABANICO = 1.6;
/** Desplazamiento de una ficha dentro de un grupo que comparte casilla. */
function offsetAbanico(indice: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 };
  const ang = (2 * Math.PI * indice) / total - Math.PI / 2;
  return { dx: Math.cos(ang) * RADIO_ABANICO, dy: Math.sin(ang) * RADIO_ABANICO };
}

/** Render del tablero: anillo, seguros, pasillos/garajes/meta por color y las fichas. */
export function Tablero({ estado, jugables, esMiTurno, miColor, onMover }: Props) {
  const colorSalida = new Map<number, Color>();
  estado.colores.forEach((color) => colorSalida.set(SALIDA[color], color));
  const angulo = miColor ? ANGULO_POR_COLOR[miColor] : 0;

  // Fichas con su coordenada; las que comparten casilla se abren en abanico para verse todas.
  const fichas = estado.colores.flatMap((color) =>
    (estado.fichas[color] ?? []).map((ficha) => {
      const { x, y } = coordenadaFicha(color, ficha);
      return { color, ficha, x, y };
    }),
  );
  const totalEnCasilla = new Map<string, number>();
  for (const f of fichas) {
    const clave = `${f.x},${f.y}`;
    totalEnCasilla.set(clave, (totalEnCasilla.get(clave) ?? 0) + 1);
  }
  const indiceEnCasilla = new Map<string, number>();
  const fichasRender = fichas.map((f) => {
    const clave = `${f.x},${f.y}`;
    const total = totalEnCasilla.get(clave)!;
    const indice = indiceEnCasilla.get(clave) ?? 0;
    indiceEnCasilla.set(clave, indice + 1);
    const { dx, dy } = offsetAbanico(indice, total);
    return { ...f, cx: f.x + dx, cy: f.y + dy, escala: total > 1 ? 0.74 : 1 };
  });

  return (
    <svg viewBox={VIEWBOX} className="tablero" role="img" aria-label="Tablero de parchís">
      <rect x={0} y={0} width={100} height={100} rx={3} fill="#faf7ee" />

      <g transform={`rotate(${angulo} 50 50)`}>
      {/* Casas (garajes) coloreadas en las esquinas */}
      {estado.colores.map((color) => {
        const g = GARAJE[color];
        const cx = (g[0].x + g[3].x) / 2;
        const cy = (g[0].y + g[3].y) / 2;
        return (
          <rect key={`casa-${color}`} x={cx - 8} y={cy - 8} width={16} height={16} rx={3} fill={COLOR_HEX[color]} opacity={0.14} />
        );
      })}

      {ANILLO.map((p, i) => (
        <rect
          key={i}
          x={p.x - 2}
          y={p.y - 2}
          width={4}
          height={4}
          rx={0.8}
          fill={colorSalida.has(i) ? COLOR_HEX[colorSalida.get(i)!] : SEGUROS.includes(i) ? '#d8d2c0' : '#fff'}
          stroke="#c3bca8"
          strokeWidth={0.25}
        />
      ))}

      {estado.colores.map((color) => (
        <g key={color}>
          {PASILLO[color].map((p, k) => (
            <rect key={k} x={p.x - 2} y={p.y - 2} width={4} height={4} rx={0.8} fill={COLOR_HEX[color]} opacity={0.3} />
          ))}
          {GARAJE[color].map((p, k) => (
            <circle key={k} cx={p.x} cy={p.y} r={3} fill="none" stroke={COLOR_HEX[color]} strokeWidth={0.5} />
          ))}
          <circle cx={META[color].x} cy={META[color].y} r={2.2} fill={COLOR_HEX[color]} opacity={0.25} />
        </g>
      ))}

      {fichasRender.map(({ color, ficha, cx, cy, escala }) => {
        const jugable = esMiTurno && color === miColor && jugables.has(ficha.id);
        return (
          <Ficha
            key={`${color}-${ficha.id}`}
            color={color}
            fichaId={ficha.id}
            cx={cx}
            cy={cy}
            jugable={jugable}
            escala={escala}
            onClick={() => onMover(ficha.id)}
          />
        );
      })}
      </g>
    </svg>
  );
}
