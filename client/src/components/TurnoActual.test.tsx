import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EstadoPartida, Jugador } from '@parchis/shared';
import { TurnoActual } from './TurnoActual';

const estado = {
  colores: ['rojo', 'azul'],
  turnoActual: 'rojo',
} as EstadoPartida;

const jugadores: Jugador[] = [
  { id: '1', nombre: 'Ana', color: 'rojo', conectado: true, esHost: true },
  { id: '2', nombre: 'Beto', color: 'azul', conectado: false, esHost: false },
];

afterEach(cleanup);

describe('TurnoActual', () => {
  it('marca al jugador desconectado', () => {
    render(<TurnoActual estado={estado} miColor="rojo" jugadores={jugadores} />);
    expect(screen.getByText(/azul \(desconectado\)/)).toBeTruthy();
  });

  it('marca como ausente a quien lo está', () => {
    const conAusente = jugadores.map((j) => (j.color === 'azul' ? { ...j, conectado: true, ausente: true } : j));
    render(<TurnoActual estado={estado} miColor="rojo" jugadores={conAusente} />);
    expect(screen.getByText(/azul \(ausente\)/)).toBeTruthy();
  });
});
