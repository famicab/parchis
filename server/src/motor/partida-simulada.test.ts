import { describe, expect, it } from 'vitest';
import type { EstadoPartida } from '@parchis/shared';
import { crearEstadoInicial, jugadasLegales, reducir } from './index';
import { AVANCE_META, avanceDeFicha } from './tablero';

// Simula una partida completa de 4 jugadores conduciendo el reductor real.
// Estrategia determinista: rojo saca y lleva sus fichas a meta de una en una;
// los demás siempre reciben un 1 (no pueden salir del garaje) y pasan turno.
// Como los rivales nunca pisan el anillo, no hay capturas ni barreras, así que
// el desenlace es predecible y finito.

/** Primera ficha de rojo que aún no está en meta (las recorremos por orden). */
function fichaActivaRojo(estado: EstadoPartida) {
  return estado.fichas.rojo!.find((f) => f.zona !== 'META');
}

function elegirDado(estado: EstadoPartida): number {
  if (estado.turnoActual !== 'rojo') return 1; // los rivales no salen nunca
  const activa = fichaActivaRojo(estado);
  if (!activa || activa.zona === 'GARAJE') return 5; // sacar del garaje
  const restante = AVANCE_META - avanceDeFicha('rojo', activa);
  let dado = Math.min(6, restante);
  if (dado === 6 && estado.segundosSeises === 2) dado = 5; // evitar el tercer 6
  return dado;
}

function elegirFicha(estado: EstadoPartida, legales: number[]): number {
  if (estado.turnoActual === 'rojo') {
    const activa = fichaActivaRojo(estado);
    if (activa && legales.includes(activa.id)) return activa.id;
  }
  return legales[0];
}

describe('motor · partida completa simulada (4 jugadores)', () => {
  it('rojo recorre el tablero de principio a fin hasta ganar', () => {
    let estado = crearEstadoInicial('SIM', ['rojo', 'azul', 'amarillo', 'verde']);
    const MAX = 3000;
    let iteraciones = 0;
    let huboTurnoExtra = false;
    let huboMeta = false;

    while (estado.fase === 'EN_CURSO' && iteraciones < MAX) {
      iteraciones += 1;
      const color = estado.turnoActual;

      if (estado.bonusPendiente) {
        const legales = jugadasLegales(estado);
        const r = reducir(estado, { tipo: 'MOVER_FICHA', color, fichaId: legales[0] });
        expect(r.error).toBeNull();
        estado = r.estado;
        continue;
      }

      if (estado.dado === null) {
        const r = reducir(estado, { tipo: 'TIRAR_DADO', color, valor: elegirDado(estado) });
        expect(r.error).toBeNull();
        estado = r.estado;
        continue;
      }

      const legales = jugadasLegales(estado);
      if (legales.length === 0) {
        const r = reducir(estado, { tipo: 'PASAR_TURNO', color });
        expect(r.error).toBeNull();
        estado = r.estado;
        continue;
      }

      const r = reducir(estado, { tipo: 'MOVER_FICHA', color, fichaId: elegirFicha(estado, legales) });
      expect(r.error).toBeNull();
      estado = r.estado;
      if (r.eventos.includes('TURNO_EXTRA')) huboTurnoExtra = true;
      if (r.eventos.includes('META')) huboMeta = true;
    }

    // La partida terminó con rojo ganador y sus 4 fichas en meta.
    expect(estado.fase).toBe('TERMINADA');
    expect(estado.ganador).toBe('rojo');
    expect(estado.fichas.rojo!.every((f) => f.zona === 'META')).toBe(true);

    // Los rivales nunca salieron del garaje (no interfirieron).
    for (const color of ['azul', 'amarillo', 'verde'] as const) {
      expect(estado.fichas[color]!.every((f) => f.zona === 'GARAJE')).toBe(true);
    }

    // Se ejercitó una partida real (no un atajo) con turnos extra y llegadas a meta.
    expect(iteraciones).toBeGreaterThan(50);
    expect(iteraciones).toBeLessThan(MAX);
    expect(huboTurnoExtra).toBe(true);
    expect(huboMeta).toBe(true);
  });
});
