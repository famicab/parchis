import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalaProvider } from '../sala/SalaContext';
import { PantallaInicio } from './PantallaInicio';

const { fakeSocket, llamadas } = vi.hoisted(() => {
  const llamadas: { evento: string; args: unknown[] }[] = [];
  return {
    llamadas,
    fakeSocket: {
      connected: true,
      on() {},
      off() {},
      emit(evento: string, ...args: unknown[]) {
        llamadas.push({ evento, args });
        const ack = args[args.length - 1];
        if (typeof ack !== 'function') return;
        if (evento === 'crear_partida') {
          ack({ ok: true, codigo: 'ABCDEF', jugadorId: 'p1', color: 'rojo' });
        } else if (evento === 'unirse_partida') {
          ack({ ok: false, error: { codigo: 'SALA_NO_EXISTE', mensaje: 'No existe una sala con ese código.' } });
        }
      },
    },
  };
});

vi.mock('../socket', () => ({ socket: fakeSocket }));

function montar(codigoInicial = '') {
  return render(
    <MemoryRouter>
      <SalaProvider>
        <PantallaInicio codigoInicial={codigoInicial} />
      </SalaProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  llamadas.length = 0;
  cleanup();
});

describe('PantallaInicio', () => {
  it('deshabilita las acciones sin nombre', () => {
    montar();
    expect((screen.getByText('Crear partida nueva') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emite crear_partida con el nombre saneado', async () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te llamas?'), { target: { value: '  Ana  ' } });
    fireEvent.click(screen.getByText('Crear partida nueva'));

    await waitFor(() => expect(llamadas.some((l) => l.evento === 'crear_partida')).toBe(true));
    const llamada = llamadas.find((l) => l.evento === 'crear_partida');
    expect(llamada?.args[0]).toEqual({ nombre: 'Ana' });
  });

  it('muestra el error del servidor al unirse a una sala inexistente', async () => {
    montar('ABCDEF');
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te llamas?'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByText('Unirse'));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('No existe una sala con ese código.');
  });
});
