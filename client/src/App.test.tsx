import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import App from './App';

// Socket falso controlable. vi.hoisted permite referenciarlo dentro de vi.mock.
const { fakeSocket, fire } = vi.hoisted(() => {
  const handlers: Record<string, Set<() => void>> = {};
  return {
    fakeSocket: {
      connected: false,
      on(evento: string, cb: () => void) {
        (handlers[evento] ??= new Set()).add(cb);
      },
      off(evento: string, cb: () => void) {
        handlers[evento]?.delete(cb);
      },
    },
    fire(evento: string) {
      handlers[evento]?.forEach((cb) => cb());
    },
  };
});

vi.mock('./socket', () => ({ socket: fakeSocket }));

afterEach(() => {
  fakeSocket.connected = false;
  cleanup();
});

describe('App · indicador de conexión', () => {
  it('arranca mostrando "Desconectado"', () => {
    render(<App />);
    expect(screen.getByRole('status').textContent).toContain('Desconectado');
  });

  it('pasa a "Conectado" cuando el socket emite connect', () => {
    render(<App />);
    act(() => {
      fakeSocket.connected = true;
      fire('connect');
    });
    expect(screen.getByRole('status').textContent).toContain('Conectado');
  });

  it('vuelve a "Desconectado" cuando el socket emite disconnect', () => {
    fakeSocket.connected = true;
    render(<App />);
    act(() => {
      fakeSocket.connected = false;
      fire('disconnect');
    });
    expect(screen.getByRole('status').textContent).toContain('Desconectado');
  });
});
