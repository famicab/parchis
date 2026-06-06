import type { Color } from '@parchis/shared';

// Capa de geometría visual: traduce las posiciones abstractas del motor a
// coordenadas de un viewBox 0..100. Es un tablero "cuadrado" claro (no la cruz
// clásica); la cruz queda como mejora de pulido (Sprint 5). Ver
// plans/sprint-3-tablero-y-juego.md §2.

export const VIEWBOX = '0 0 100 100';

const MIN = 10;
const MAX = 90;
const CENTRO = 50;
const LADO = MAX - MIN; // longitud de cada lado del anillo

export interface Punto {
  x: number;
  y: number;
}

/** 68 casillas en el perímetro de un cuadrado; la salida 0 cae en el centro del lado superior. */
function puntoAnillo(indice: number): Punto {
  const perimetro = 4 * LADO;
  // +LADO/2 desplaza el origen al centro del lado superior (donde sale rojo).
  const d = (((indice / 68) * perimetro + LADO / 2) % perimetro + perimetro) % perimetro;
  if (d < LADO) return { x: MIN + d, y: MIN };
  if (d < 2 * LADO) return { x: MAX, y: MIN + (d - LADO) };
  if (d < 3 * LADO) return { x: MAX - (d - 2 * LADO), y: MAX };
  return { x: MIN, y: MAX - (d - 3 * LADO) };
}

export const SALIDA: Record<Color, number> = { rojo: 0, azul: 17, amarillo: 34, verde: 51 };
const DIRECCION: Record<Color, Punto> = {
  rojo: { x: 0, y: 1 },
  azul: { x: -1, y: 0 },
  amarillo: { x: 0, y: -1 },
  verde: { x: 1, y: 0 },
};

const PASO_PASILLO = (CENTRO - MIN) / 8;

function pasilloDe(color: Color): Punto[] {
  const salida = puntoAnillo(SALIDA[color]);
  const dir = DIRECCION[color];
  return Array.from({ length: 7 }, (_, k) => ({
    x: salida.x + dir.x * PASO_PASILLO * (k + 1),
    y: salida.y + dir.y * PASO_PASILLO * (k + 1),
  }));
}

const GARAJE_CENTRO: Record<Color, Punto> = {
  rojo: { x: 22, y: 22 },
  azul: { x: 78, y: 22 },
  amarillo: { x: 78, y: 78 },
  verde: { x: 22, y: 78 },
};

function garajeDe(color: Color): Punto[] {
  const c = GARAJE_CENTRO[color];
  const o = 6;
  return [
    { x: c.x - o, y: c.y - o },
    { x: c.x + o, y: c.y - o },
    { x: c.x - o, y: c.y + o },
    { x: c.x + o, y: c.y + o },
  ];
}

export const ANILLO: ReadonlyArray<Punto> = Array.from({ length: 68 }, (_, i) => puntoAnillo(i));

export const PASILLO: Record<Color, Punto[]> = {
  rojo: pasilloDe('rojo'),
  azul: pasilloDe('azul'),
  amarillo: pasilloDe('amarillo'),
  verde: pasilloDe('verde'),
};

// Meta en el centro, con un pequeño desplazamiento por color para no solaparse.
export const META: Record<Color, Punto> = {
  rojo: { x: CENTRO, y: CENTRO + 4 },
  azul: { x: CENTRO - 4, y: CENTRO },
  amarillo: { x: CENTRO, y: CENTRO - 4 },
  verde: { x: CENTRO + 4, y: CENTRO },
};

export const GARAJE: Record<Color, Punto[]> = {
  rojo: garajeDe('rojo'),
  azul: garajeDe('azul'),
  amarillo: garajeDe('amarillo'),
  verde: garajeDe('verde'),
};

// Espejo de motor/tablero (solo para resaltar seguros visualmente).
export const SEGUROS: ReadonlyArray<number> = [0, 17, 34, 51, 7, 12, 22, 29, 39, 46, 56, 63];
