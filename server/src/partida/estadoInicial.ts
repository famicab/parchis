import type { Color, EstadoPartida, Ficha } from '@parchis/shared';

/**
 * Crea el estado inicial de una partida: las 4 fichas de cada color en el garaje,
 * orden de turnos = orden de `colores`, primer turno al primer color.
 *
 * Seam con el Sprint 2: esto es lo único del "motor" que toca el Sprint 1.
 * El cálculo de jugadas y los movimientos llegan con la épica E3.
 */
export function crearEstadoInicial(id: string, colores: Color[]): EstadoPartida {
  const fichas: Partial<Record<Color, Ficha[]>> = {};
  for (const color of colores) {
    fichas[color] = [0, 1, 2, 3].map((idFicha) => ({ id: idFicha, zona: 'GARAJE' as const }));
  }

  return {
    id,
    fase: 'EN_CURSO',
    colores,
    turnoActual: colores[0],
    dado: null,
    segundosSeises: 0,
    tiradaExtra: false,
    ultimaFichaMovida: null,
    bonusPendiente: null,
    fichas,
    ganador: null,
  };
}
