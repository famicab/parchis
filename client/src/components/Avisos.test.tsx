import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Avisos, mensajeDeEventos } from './Avisos';

afterEach(cleanup);

describe('Avisos', () => {
  it('prioriza el evento más relevante', () => {
    expect(mensajeDeEventos(['MUEVE', 'COME'])).toMatch(/Captura/);
    expect(mensajeDeEventos(['MUEVE', 'META'])).toMatch(/meta/i);
    expect(mensajeDeEventos(['TURNO_EXTRA'])).toMatch(/extra/i);
    expect(mensajeDeEventos(['MUEVE'])).toBeNull();
  });

  it('muestra un toast cuando hay un evento relevante', () => {
    render(<Avisos eventos={['COME']} trigger={1} />);
    expect(screen.getByRole('status').textContent).toMatch(/Captura/);
  });

  it('no muestra nada con eventos irrelevantes', () => {
    render(<Avisos eventos={['MUEVE']} trigger={1} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
