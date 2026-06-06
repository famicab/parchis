import { describe, expect, it } from 'vitest';
import type { EstadoPartida, Ficha } from '@parchis/shared';
import { elegirFichaAuto } from './autojuego';

const F = (id: number, zona: Ficha['zona'], extra: Partial<Ficha> = {}): Ficha => ({ id, zona, ...extra });
const garaje = (): Ficha[] => [0, 1, 2, 3].map((id) => F(id, 'GARAJE'));

function base(p: Partial<EstadoPartida> = {}): EstadoPartida {
  return {
    id: 'T',
    fase: 'EN_CURSO',
    colores: ['rojo', 'azul'],
    turnoActual: 'rojo',
    dado: null,
    segundosSeises: 0,
    tiradaExtra: false,
    ultimaFichaMovida: null,
    bonusPendiente: null,
    fichas: { rojo: garaje(), azul: garaje() },
    ganador: null,
    ...p,
  };
}

describe('elegirFichaAuto', () => {
  it('prioriza comer aunque otra ficha esté más adelantada', () => {
    const estado = base({
      dado: 3,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 5 }), F(1, 'ANILLO', { casilla: 30 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
        azul: [F(0, 'ANILLO', { casilla: 8 }), ...garaje().slice(1)], // 5+3 = 8 → captura
      },
    });
    expect(elegirFichaAuto(estado)).toBe(0);
  });

  it('prioriza llegar a meta', () => {
    const estado = base({
      dado: 3,
      fichas: {
        rojo: [F(0, 'PASILLO', { paso: 5 }), F(1, 'ANILLO', { casilla: 40 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
        azul: garaje(),
      },
    });
    expect(elegirFichaAuto(estado)).toBe(0); // paso 5 + 3 = meta
  });

  it('sin comer/meta, elige la ficha más adelantada', () => {
    const estado = base({
      dado: 4,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 10 }), F(1, 'ANILLO', { casilla: 30 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
        azul: garaje(),
      },
    });
    expect(elegirFichaAuto(estado)).toBe(1);
  });

  it('ante empate de avance, elige la de menor id', () => {
    const estado = base({
      dado: 4,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 10 }), F(1, 'ANILLO', { casilla: 10 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
        azul: garaje(),
      },
    });
    expect(elegirFichaAuto(estado)).toBe(0);
  });

  it('devuelve null si no hay jugadas legales', () => {
    expect(elegirFichaAuto(base({ dado: 3 }))).toBeNull(); // todas en garaje, 3 ≠ 5
  });
});
