import type { EstadoPartida } from '@parchis/shared';
import { jugadasLegales, reducir } from './motor';
import { avanceDeFicha } from './tablero';

/**
 * Elige la ficha que jugará el servidor automáticamente (timeout/AFK), con la
 * prioridad fijada: (1) comer o llegar a meta, (2) la ficha más adelantada,
 * (3) desempate por menor id. Devuelve null si no hay jugadas legales.
 *
 * Función pura: usa el propio motor para saber el resultado de cada jugada.
 */
export function elegirFichaAuto(estado: EstadoPartida): number | null {
  const legales = jugadasLegales(estado);
  if (legales.length === 0) return null;

  const color = estado.turnoActual;

  // 1) Prioriza comer o llegar a meta.
  for (const fichaId of legales) {
    const { error, eventos } = reducir(estado, { tipo: 'MOVER_FICHA', color, fichaId });
    if (!error && (eventos.includes('COME') || eventos.includes('META'))) return fichaId;
  }

  // 2) La ficha más adelantada; (3) ante empate, la de menor id (orden ascendente).
  const fichas = estado.fichas[color] ?? [];
  let mejor = legales[0];
  let mejorAvance = -1;
  for (const fichaId of legales) {
    const ficha = fichas.find((f) => f.id === fichaId);
    const avance = ficha && ficha.zona !== 'GARAJE' ? avanceDeFicha(color, ficha) : -1;
    if (avance > mejorAvance) {
      mejorAvance = avance;
      mejor = fichaId;
    }
  }
  return mejor;
}
