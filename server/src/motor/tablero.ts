import type { Color, Ficha } from '@parchis/shared';

// Geometría del tablero. Cada color recorre el mismo anillo de 68 casillas
// empezando en su salida, y tras 64 casillas se desvía a su pasillo (7 cuadros)
// hasta la meta. Alineado con plans/fase-2-motor-de-juego.md §1.

export const CASILLAS_ANILLO = 68;
export const PASOS_PASILLO = 7;
/** Avance del último cuadro de anillo antes de desviarse al pasillo. */
export const ULTIMO_AVANCE_ANILLO = 63;
/** Avance exacto que coloca la ficha en la meta. */
export const AVANCE_META = ULTIMO_AVANCE_ANILLO + PASOS_PASILLO + 1; // 71

export const SALIDA: Record<Color, number> = { rojo: 0, azul: 17, amarillo: 34, verde: 51 };

// Seguros simétricos: en cada cuadrante de 17, la salida y dos más (+7, +12).
// En un seguro no se puede comer.
export const CASILLAS_SEGURAS: ReadonlySet<number> = new Set([
  0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63,
]);

export type Posicion =
  | { zona: 'ANILLO'; casilla: number }
  | { zona: 'PASILLO'; paso: number }
  | { zona: 'META' };

/** Proyecta un avance (pasos desde la salida) a una posición concreta del tablero. */
export function avanceAPosicion(color: Color, avance: number): Posicion | null {
  if (avance < 0 || avance > AVANCE_META) return null;
  if (avance <= ULTIMO_AVANCE_ANILLO) {
    return { zona: 'ANILLO', casilla: (SALIDA[color] + avance) % CASILLAS_ANILLO };
  }
  if (avance < AVANCE_META) {
    return { zona: 'PASILLO', paso: avance - ULTIMO_AVANCE_ANILLO };
  }
  return { zona: 'META' };
}

/** Avance actual de una ficha en juego (no aplicable al garaje). */
export function avanceDeFicha(color: Color, ficha: Ficha): number {
  switch (ficha.zona) {
    case 'ANILLO':
      return ((((ficha.casilla ?? 0) - SALIDA[color]) % CASILLAS_ANILLO) + CASILLAS_ANILLO) % CASILLAS_ANILLO;
    case 'PASILLO':
      return ULTIMO_AVANCE_ANILLO + (ficha.paso ?? 0);
    case 'META':
      return AVANCE_META;
    default:
      throw new Error('avanceDeFicha no aplica a una ficha en garaje');
  }
}

export function esSeguro(casilla: number): boolean {
  return CASILLAS_SEGURAS.has(casilla);
}
