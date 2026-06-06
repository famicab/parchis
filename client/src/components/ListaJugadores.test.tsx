import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Jugador } from '@parchis/shared';
import { ListaJugadores } from './ListaJugadores';

const JUGADORES: Jugador[] = [
  { id: '1', nombre: 'Ana', color: 'rojo', conectado: true, esHost: true },
  { id: '2', nombre: 'Beto', color: 'azul', conectado: true, esHost: false },
];

afterEach(cleanup);

describe('ListaJugadores', () => {
  it('pinta el nombre de cada jugador', () => {
    render(<ListaJugadores jugadores={JUGADORES} hostId="1" />);
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Beto')).toBeTruthy();
  });

  it('marca como anfitrión solo al jugador con hostId', () => {
    render(<ListaJugadores jugadores={JUGADORES} hostId="1" />);
    expect(screen.getAllByLabelText('Anfitrión')).toHaveLength(1);
  });

  it('no rompe con lista vacía', () => {
    render(<ListaJugadores jugadores={[]} hostId={null} />);
    expect(screen.queryByLabelText('Anfitrión')).toBeNull();
  });
});
