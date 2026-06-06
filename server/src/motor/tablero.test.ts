import { describe, expect, it } from 'vitest';
import { AVANCE_META, avanceAPosicion, avanceDeFicha, esSeguro } from './tablero';

describe('geometría del tablero', () => {
  it('proyecta el avance de rojo a anillo, pasillo y meta', () => {
    expect(avanceAPosicion('rojo', 0)).toEqual({ zona: 'ANILLO', casilla: 0 });
    expect(avanceAPosicion('rojo', 63)).toEqual({ zona: 'ANILLO', casilla: 63 });
    expect(avanceAPosicion('rojo', 64)).toEqual({ zona: 'PASILLO', paso: 1 });
    expect(avanceAPosicion('rojo', 70)).toEqual({ zona: 'PASILLO', paso: 7 });
    expect(avanceAPosicion('rojo', 71)).toEqual({ zona: 'META' });
    expect(avanceAPosicion('rojo', 72)).toBeNull();
  });

  it('cada color sale en su casilla y se desvía 5 antes de su salida', () => {
    expect(avanceAPosicion('azul', 0)).toEqual({ zona: 'ANILLO', casilla: 17 });
    expect(avanceAPosicion('azul', 63)).toEqual({ zona: 'ANILLO', casilla: 12 });
    expect(avanceAPosicion('amarillo', 63)).toEqual({ zona: 'ANILLO', casilla: 29 });
    expect(avanceAPosicion('verde', 63)).toEqual({ zona: 'ANILLO', casilla: 46 });
  });

  it('avanceDeFicha es la inversa de avanceAPosicion', () => {
    expect(avanceDeFicha('rojo', { id: 0, zona: 'ANILLO', casilla: 10 })).toBe(10);
    expect(avanceDeFicha('azul', { id: 0, zona: 'ANILLO', casilla: 12 })).toBe(63);
    expect(avanceDeFicha('rojo', { id: 0, zona: 'PASILLO', paso: 3 })).toBe(66);
    expect(avanceDeFicha('rojo', { id: 0, zona: 'META' })).toBe(AVANCE_META);
  });

  it('identifica casillas seguras', () => {
    expect(esSeguro(0)).toBe(true);
    expect(esSeguro(17)).toBe(true);
    expect(esSeguro(63)).toBe(true);
    expect(esSeguro(5)).toBe(false);
    expect(esSeguro(8)).toBe(false);
  });
});
