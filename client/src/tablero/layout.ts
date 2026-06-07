import type { Color } from '@parchis/shared';

// Capa de geometría visual: traduce las posiciones abstractas del motor a
// coordenadas de un viewBox 0..100. Las 68 casillas se reparten por el contorno
// de una CRUZ (los 4 brazos del parchís); la salida 0 cae en la punta del brazo
// superior. Ver plans/sprint-3-tablero-y-juego.md §2 y sprint-5 §3.

export const VIEWBOX = '0 0 100 100';

const MIN = 10;
const MAX = 90;
const CENTRO = 50;
const W = 8; // semianchura de los brazos de la cruz

export interface Punto {
  x: number;
  y: number;
}

// Contorno de la cruz (sentido horario) desde la esquina izquierda del brazo superior.
const A = CENTRO - W; // borde interior izquierdo/superior de los brazos
const B = CENTRO + W; // borde interior derecho/inferior
const VERTICES: Punto[] = [
  { x: A, y: MIN }, { x: B, y: MIN }, // brazo superior (punta)
  { x: B, y: A }, { x: MAX, y: A }, // brazo derecho (punta)
  { x: MAX, y: B }, { x: B, y: B },
  { x: B, y: MAX }, { x: A, y: MAX }, // brazo inferior (punta)
  { x: A, y: B }, { x: MIN, y: B }, // brazo izquierdo (punta)
  { x: MIN, y: A }, { x: A, y: A },
];

const SEGMENTOS = VERTICES.map((desde, i) => {
  const hasta = VERTICES[(i + 1) % VERTICES.length];
  return { desde, hasta, len: Math.hypot(hasta.x - desde.x, hasta.y - desde.y) };
});
const PERIMETRO = SEGMENTOS.reduce((t, s) => t + s.len, 0);
const DESFASE = (B - A) / 2; // media arista superior: coloca la salida 0 en el centro de la punta

/** 68 casillas repartidas por el contorno de la cruz; salida 0 en la punta superior. */
function puntoAnillo(indice: number): Punto {
  let d = (((indice / 68) * PERIMETRO + DESFASE) % PERIMETRO + PERIMETRO) % PERIMETRO;
  for (const s of SEGMENTOS) {
    if (d <= s.len) {
      const t = s.len === 0 ? 0 : d / s.len;
      return { x: s.desde.x + (s.hasta.x - s.desde.x) * t, y: s.desde.y + (s.hasta.y - s.desde.y) * t };
    }
    d -= s.len;
  }
  return VERTICES[0];
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
