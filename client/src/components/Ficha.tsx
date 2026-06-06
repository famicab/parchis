import type { Color } from '@parchis/shared';
import { COLOR_HEX } from '../tablero/colores';

interface Props {
  color: Color;
  fichaId: number;
  cx: number;
  cy: number;
  jugable: boolean;
  onClick: () => void;
}

/** Una ficha en el tablero SVG. Resalta y es clicable si es una jugada legal. */
export function Ficha({ color, fichaId, cx, cy, jugable, onClick }: Props) {
  return (
    <circle
      data-testid={`ficha-${color}-${fichaId}`}
      cx={cx}
      cy={cy}
      r={2.6}
      fill={COLOR_HEX[color]}
      stroke={jugable ? '#111' : '#0006'}
      strokeWidth={jugable ? 0.9 : 0.4}
      className={jugable ? 'ficha jugable' : 'ficha'}
      onClick={jugable ? onClick : undefined}
      style={{ cursor: jugable ? 'pointer' : 'default' }}
    />
  );
}
