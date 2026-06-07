import { describe, expect, it } from 'vitest';
import { ANILLO, GARAJE, META, PASILLO } from './layout';
import { coordenadaFicha } from './posicion';

const dentroDelTablero = (p: { x: number; y: number }) =>
  p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100;

describe('layout del tablero', () => {
  it('el anillo tiene 68 casillas, todas dentro del viewBox', () => {
    expect(ANILLO).toHaveLength(68);
    expect(ANILLO.every(dentroDelTablero)).toBe(true);
  });

  it('cada salida está en su brazo de la cruz', () => {
    expect(ANILLO[0].y).toBeLessThan(25); // rojo: brazo de arriba
    expect(ANILLO[17].x).toBeGreaterThan(75); // azul: brazo de la derecha
    expect(ANILLO[34].y).toBeGreaterThan(75); // amarillo: brazo de abajo
    expect(ANILLO[51].x).toBeLessThan(25); // verde: brazo de la izquierda
  });

  it('cada color tiene 7 cuadros de pasillo y 4 plazas de garaje', () => {
    for (const color of ['rojo', 'azul', 'amarillo', 'verde'] as const) {
      expect(PASILLO[color]).toHaveLength(7);
      expect(GARAJE[color]).toHaveLength(4);
      expect(PASILLO[color].every(dentroDelTablero)).toBe(true);
    }
  });
});

describe('coordenadaFicha', () => {
  it('mapea cada zona a su coordenada', () => {
    expect(coordenadaFicha('rojo', { id: 2, zona: 'GARAJE' })).toEqual(GARAJE.rojo[2]);
    expect(coordenadaFicha('rojo', { id: 0, zona: 'ANILLO', casilla: 5 })).toEqual(ANILLO[5]);
    expect(coordenadaFicha('azul', { id: 0, zona: 'PASILLO', paso: 3 })).toEqual(PASILLO.azul[2]);
  });

  it('separa las fichas dentro de la meta', () => {
    const a = coordenadaFicha('rojo', { id: 0, zona: 'META' });
    const b = coordenadaFicha('rojo', { id: 3, zona: 'META' });
    expect(a.x).not.toBe(b.x);
    expect(a.y).toBe(META.rojo.y);
  });
});
