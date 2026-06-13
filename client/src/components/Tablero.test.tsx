import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { EstadoPartida, Ficha } from '@parchis/shared';
import { Tablero } from './Tablero';

const garaje = (): Ficha[] => [0, 1, 2, 3].map((id) => ({ id, zona: 'GARAJE' }));

const estado: EstadoPartida = {
  id: 'T',
  fase: 'EN_CURSO',
  colores: ['rojo', 'azul'],
  turnoActual: 'rojo',
  dado: 5,
  segundosSeises: 0,
  tiradaExtra: false,
  ultimaFichaMovida: null,
  bonusPendiente: null,
  fichas: { rojo: garaje(), azul: garaje() },
  ganador: null,
};

afterEach(cleanup);

describe('Tablero', () => {
  it('pinta las 16 fichas (4 por color)', () => {
    render(
      <Tablero estado={estado} jugables={new Set()} esMiTurno={false} miColor="rojo" onMover={() => {}} />,
    );
    expect(screen.getByTestId('ficha-rojo-0')).toBeTruthy();
    expect(screen.getByTestId('ficha-azul-3')).toBeTruthy();
  });

  it('al hacer clic en una ficha jugable, mueve esa ficha', () => {
    const onMover = vi.fn();
    render(
      <Tablero estado={estado} jugables={new Set([0])} esMiTurno miColor="rojo" onMover={onMover} />,
    );
    fireEvent.click(screen.getByTestId('ficha-rojo-0'));
    expect(onMover).toHaveBeenCalledWith(0);
  });

  it('una ficha no jugable no dispara el movimiento', () => {
    const onMover = vi.fn();
    render(
      <Tablero estado={estado} jugables={new Set([0])} esMiTurno miColor="rojo" onMover={onMover} />,
    );
    fireEvent.click(screen.getByTestId('ficha-rojo-1')); // 1 no está en jugables
    expect(onMover).not.toHaveBeenCalled();
  });

  it('separa en abanico dos fichas que comparten casilla', () => {
    const apiladas: EstadoPartida = {
      ...estado,
      fichas: {
        rojo: [
          { id: 0, zona: 'ANILLO', casilla: 5 },
          { id: 1, zona: 'ANILLO', casilla: 5 },
          { id: 2, zona: 'GARAJE' },
          { id: 3, zona: 'GARAJE' },
        ],
        azul: garaje(),
      },
    };
    render(<Tablero estado={apiladas} jugables={new Set()} esMiTurno={false} miColor="rojo" onMover={() => {}} />);
    const a = screen.getByTestId('ficha-rojo-0');
    const b = screen.getByTestId('ficha-rojo-1');
    const distintas = a.getAttribute('cx') !== b.getAttribute('cx') || a.getAttribute('cy') !== b.getAttribute('cy');
    expect(distintas).toBe(true);
  });

  it('rota el tablero según el color del jugador (su garaje abajo-derecha)', () => {
    const { container, rerender } = render(
      <Tablero estado={estado} jugables={new Set()} esMiTurno={false} miColor="azul" onMover={() => {}} />,
    );
    expect(container.querySelector('g[transform="rotate(0 50 50)"]')).toBeTruthy();
    rerender(
      <Tablero estado={estado} jugables={new Set()} esMiTurno={false} miColor="verde" onMover={() => {}} />,
    );
    expect(container.querySelector('g[transform="rotate(180 50 50)"]')).toBeTruthy();
  });
});
