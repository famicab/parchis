import type { Color } from '@parchis/shared';

// Capa de geometría visual: traduce las posiciones abstractas del motor a
// coordenadas de un viewBox 0..100.
// - Anillo cuadrado: las salidas (casillas 0/17/34/51) caen en las 4 ESQUINAS,
//   justo al lado de la casa de cada color (así, al salir del garaje, la ficha
//   aparece junto a su casa).
// - Pasillos: en diagonal desde la casilla de entrada hacia el centro.
// - Casas (garajes): en las esquinas.

export const VIEWBOX = '0 0 100 100';

const MIN = 15;
const MAX = 85;
const CENTRO = 50;
const LADO = MAX - MIN; // 70

export interface Punto {
  x: number;
  y: number;
}

export const SALIDA: Record<Color, number> = { rojo: 0, azul: 17, amarillo: 34, verde: 51 };

/** 68 casillas en el perímetro de un cuadrado; las salidas (0/17/34/51) en las esquinas. */
function puntoAnillo(indice: number): Punto {
  const perimetro = 4 * LADO;
  const d = (((indice / 68) * perimetro) % perimetro + perimetro) % perimetro;
  if (d <= LADO) return { x: MIN + d, y: MIN }; // arriba: esquina sup-izq → sup-der
  if (d <= 2 * LADO) return { x: MAX, y: MIN + (d - LADO) }; // derecha
  if (d <= 3 * LADO) return { x: MAX - (d - 2 * LADO), y: MAX }; // abajo
  return { x: MIN, y: MAX - (d - 3 * LADO) }; // izquierda
}

export const ANILLO: ReadonlyArray<Punto> = Array.from({ length: 68 }, (_, i) => puntoAnillo(i));

// La ficha entra al pasillo 5 casillas antes de su salida (avance 63 del motor).
function casillaEntrada(color: Color): Punto {
  return puntoAnillo((SALIDA[color] + 63) % 68);
}

function pasilloDe(color: Color): Punto[] {
  const e = casillaEntrada(color);
  return Array.from({ length: 7 }, (_, k) => ({
    x: e.x + (CENTRO - e.x) * ((k + 1) / 8),
    y: e.y + (CENTRO - e.y) * ((k + 1) / 8),
  }));
}

export const PASILLO: Record<Color, Punto[]> = {
  rojo: pasilloDe('rojo'),
  azul: pasilloDe('azul'),
  amarillo: pasilloDe('amarillo'),
  verde: pasilloDe('verde'),
};

// Meta en el centro, desplazada un poco hacia la esquina de cada color para no solaparse.
function metaDe(color: Color): Punto {
  const esquina = puntoAnillo(SALIDA[color]);
  return {
    x: CENTRO + (esquina.x - CENTRO) * 0.1,
    y: CENTRO + (esquina.y - CENTRO) * 0.1,
  };
}

export const META: Record<Color, Punto> = {
  rojo: metaDe('rojo'),
  azul: metaDe('azul'),
  amarillo: metaDe('amarillo'),
  verde: metaDe('verde'),
};

// Casas (garajes) en las esquinas, junto a cada salida.
const GARAJE_CENTRO: Record<Color, Punto> = {
  rojo: { x: 9, y: 9 },
  azul: { x: 91, y: 9 },
  amarillo: { x: 91, y: 91 },
  verde: { x: 9, y: 91 },
};

function garajeDe(color: Color): Punto[] {
  const c = GARAJE_CENTRO[color];
  const o = 4;
  return [
    { x: c.x - o, y: c.y - o },
    { x: c.x + o, y: c.y - o },
    { x: c.x - o, y: c.y + o },
    { x: c.x + o, y: c.y + o },
  ];
}

export const GARAJE: Record<Color, Punto[]> = {
  rojo: garajeDe('rojo'),
  azul: garajeDe('azul'),
  amarillo: garajeDe('amarillo'),
  verde: garajeDe('verde'),
};

// Espejo de motor/tablero (solo para resaltar seguros visualmente).
export const SEGUROS: ReadonlyArray<number> = [0, 17, 34, 51, 7, 12, 22, 29, 39, 46, 56, 63];
