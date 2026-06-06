import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ResumenSala } from '@parchis/shared';
import { SalaProvider, useSala } from './SalaContext';

const { fakeSocket, fire } = vi.hoisted(() => {
  const handlers: Record<string, Set<(...a: unknown[]) => void>> = {};
  return {
    fakeSocket: {
      connected: true,
      on(evento: string, cb: (...a: unknown[]) => void) {
        (handlers[evento] ??= new Set()).add(cb);
      },
      off(evento: string, cb: (...a: unknown[]) => void) {
        handlers[evento]?.delete(cb);
      },
      emit() {},
    },
    fire(evento: string, payload: unknown) {
      handlers[evento]?.forEach((cb) => cb(payload));
    },
  };
});

vi.mock('../socket', () => ({ socket: fakeSocket }));

function Consumidor() {
  const { codigo, jugadores, fase } = useSala();
  return (
    <div>
      <span data-testid="codigo">{codigo ?? '-'}</span>
      <span data-testid="num">{jugadores.length}</span>
      <span data-testid="fase">{fase ?? '-'}</span>
    </div>
  );
}

afterEach(cleanup);

describe('SalaContext', () => {
  it('actualiza el estado al recibir lobby_actualizado del servidor', () => {
    render(
      <SalaProvider>
        <Consumidor />
      </SalaProvider>,
    );

    expect(screen.getByTestId('num').textContent).toBe('0');

    const sala: ResumenSala = {
      codigo: 'ABCDEF',
      fase: 'LOBBY',
      hostId: '1',
      maxJugadores: 4,
      jugadores: [
        { id: '1', nombre: 'Ana', color: 'rojo', conectado: true, esHost: true },
        { id: '2', nombre: 'Beto', color: 'azul', conectado: true, esHost: false },
      ],
    };
    act(() => fire('lobby_actualizado', sala));

    expect(screen.getByTestId('codigo').textContent).toBe('ABCDEF');
    expect(screen.getByTestId('num').textContent).toBe('2');
    expect(screen.getByTestId('fase').textContent).toBe('LOBBY');
  });

  it('lanza si se usa useSala fuera del provider', () => {
    // Silenciar el error esperado de React en consola.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumidor />)).toThrow(/SalaProvider/);
    spy.mockRestore();
  });
});
