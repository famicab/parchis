import type { Color } from '@parchis/shared';

// Geometría visual del tablero en CRUZ clásica (viewBox 0..100). Las coordenadas
// se generaron y verificaron con scripts/gen-tablero (cruz gruesa de brazos de 3
// de ancho: dos carriles de recorrido + pasillo central de color hacia el centro).
// Las 68 casillas del anillo van en el orden del motor (salidas 0/17/34/51).

export const VIEWBOX = '0 0 100 100';

export interface Punto {
  x: number;
  y: number;
}

export const SALIDA: Record<Color, number> = { rojo: 0, azul: 17, amarillo: 34, verde: 51 };

export const ANILLO: ReadonlyArray<Punto> = [
  { x: 86.84, y: 55.26 }, { x: 92.11, y: 55.26 }, { x: 97.37, y: 55.26 }, { x: 97.37, y: 50 },
  { x: 97.37, y: 44.74 }, { x: 92.11, y: 44.74 }, { x: 86.84, y: 44.74 }, { x: 81.58, y: 44.74 },
  { x: 76.32, y: 44.74 }, { x: 71.05, y: 44.74 }, { x: 65.79, y: 44.74 }, { x: 60.53, y: 44.74 },
  { x: 55.26, y: 39.47 }, { x: 55.26, y: 34.21 }, { x: 55.26, y: 28.95 }, { x: 55.26, y: 23.68 },
  { x: 55.26, y: 18.42 }, { x: 55.26, y: 13.16 }, { x: 55.26, y: 7.89 }, { x: 55.26, y: 2.63 },
  { x: 50, y: 2.63 }, { x: 44.74, y: 2.63 }, { x: 44.74, y: 7.89 }, { x: 44.74, y: 13.16 },
  { x: 44.74, y: 18.42 }, { x: 44.74, y: 23.68 }, { x: 44.74, y: 28.95 }, { x: 44.74, y: 34.21 },
  { x: 44.74, y: 39.47 }, { x: 39.47, y: 44.74 }, { x: 34.21, y: 44.74 }, { x: 28.95, y: 44.74 },
  { x: 23.68, y: 44.74 }, { x: 18.42, y: 44.74 }, { x: 13.16, y: 44.74 }, { x: 7.89, y: 44.74 },
  { x: 2.63, y: 44.74 }, { x: 2.63, y: 50 }, { x: 2.63, y: 55.26 }, { x: 7.89, y: 55.26 },
  { x: 13.16, y: 55.26 }, { x: 18.42, y: 55.26 }, { x: 23.68, y: 55.26 }, { x: 28.95, y: 55.26 },
  { x: 34.21, y: 55.26 }, { x: 39.47, y: 55.26 }, { x: 44.74, y: 60.53 }, { x: 44.74, y: 65.79 },
  { x: 44.74, y: 71.05 }, { x: 44.74, y: 76.32 }, { x: 44.74, y: 81.58 }, { x: 44.74, y: 86.84 },
  { x: 44.74, y: 92.11 }, { x: 44.74, y: 97.37 }, { x: 50, y: 97.37 }, { x: 55.26, y: 97.37 },
  { x: 55.26, y: 92.11 }, { x: 55.26, y: 86.84 }, { x: 55.26, y: 81.58 }, { x: 55.26, y: 76.32 },
  { x: 55.26, y: 71.05 }, { x: 55.26, y: 65.79 }, { x: 55.26, y: 60.53 }, { x: 60.53, y: 55.26 },
  { x: 65.79, y: 55.26 }, { x: 71.05, y: 55.26 }, { x: 76.32, y: 55.26 }, { x: 81.58, y: 55.26 },
];

export const PASILLO: Record<Color, Punto[]> = {
  rojo: [
    { x: 92.11, y: 50 }, { x: 86.84, y: 50 }, { x: 81.58, y: 50 }, { x: 76.32, y: 50 },
    { x: 71.05, y: 50 }, { x: 65.79, y: 50 }, { x: 60.53, y: 50 },
  ],
  azul: [
    { x: 50, y: 7.89 }, { x: 50, y: 13.16 }, { x: 50, y: 18.42 }, { x: 50, y: 23.68 },
    { x: 50, y: 28.95 }, { x: 50, y: 34.21 }, { x: 50, y: 39.47 },
  ],
  amarillo: [
    { x: 7.89, y: 50 }, { x: 13.16, y: 50 }, { x: 18.42, y: 50 }, { x: 23.68, y: 50 },
    { x: 28.95, y: 50 }, { x: 34.21, y: 50 }, { x: 39.47, y: 50 },
  ],
  verde: [
    { x: 50, y: 92.11 }, { x: 50, y: 86.84 }, { x: 50, y: 81.58 }, { x: 50, y: 76.32 },
    { x: 50, y: 71.05 }, { x: 50, y: 65.79 }, { x: 50, y: 60.53 },
  ],
};

export const META: Record<Color, Punto> = {
  rojo: { x: 53.79, y: 50 },
  azul: { x: 50, y: 46.21 },
  amarillo: { x: 46.21, y: 50 },
  verde: { x: 50, y: 53.79 },
};

// Cada garaje en la esquina contigua a la salida de su color.
export const GARAJE: Record<Color, Punto[]> = {
  rojo: [{ x: 83, y: 83 }, { x: 93, y: 83 }, { x: 83, y: 93 }, { x: 93, y: 93 }], // inf-der
  azul: [{ x: 83, y: 7 }, { x: 93, y: 7 }, { x: 83, y: 17 }, { x: 93, y: 17 }], // sup-der
  amarillo: [{ x: 7, y: 7 }, { x: 17, y: 7 }, { x: 7, y: 17 }, { x: 17, y: 17 }], // sup-izq
  verde: [{ x: 7, y: 83 }, { x: 17, y: 83 }, { x: 7, y: 93 }, { x: 17, y: 93 }], // inf-izq
};

// Espejo de motor/tablero (mismo conjunto simétrico de seguros).
export const SEGUROS: ReadonlyArray<number> = [0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63];
