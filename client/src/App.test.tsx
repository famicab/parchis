import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SalaProvider } from './sala/SalaContext';

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
      emit() {},
    },
    fire(evento: string) {
      handlers[evento]?.forEach((cb) => cb());
    },
  };
});

vi.mock('./socket', () => ({ socket: fakeSocket }));

function montar() {
  return render(
    <BrowserRouter>
      <SalaProvider>
        <App />
      </SalaProvider>
    </BrowserRouter>,
  );
}

afterEach(() => {
  fakeSocket.connected = false;
  cleanup();
});

describe('App · indicador de conexión', () => {
  it('arranca mostrando "Desconectado"', () => {
    montar();
    expect(screen.getByRole('status').textContent).toContain('Desconectado');
  });

  it('pasa a "Conectado" cuando el socket emite connect', () => {
    montar();
    act(() => {
      fakeSocket.connected = true;
      fire('connect');
    });
    expect(screen.getByRole('status').textContent).toContain('Conectado');
  });
});
