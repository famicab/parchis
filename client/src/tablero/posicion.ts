import type { Color, Ficha } from '@parchis/shared';
import { ANILLO, GARAJE, META, PASILLO, type Punto } from './layout';

/** Traduce la posición abstracta de una ficha a coordenadas del tablero (viewBox 0..100). */
export function coordenadaFicha(color: Color, ficha: Ficha): Punto {
  switch (ficha.zona) {
    case 'GARAJE':
      return GARAJE[color][ficha.id] ?? GARAJE[color][0];
    case 'ANILLO':
      return ANILLO[ficha.casilla ?? 0];
    case 'PASILLO':
      return PASILLO[color][(ficha.paso ?? 1) - 1];
    case 'META': {
      const base = META[color];
      // Separa las fichas del mismo color dentro de la meta.
      return { x: base.x + (ficha.id - 1.5) * 2, y: base.y };
    }
    default:
      return GARAJE[color][0];
  }
}
