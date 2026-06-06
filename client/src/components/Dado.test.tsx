import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dado } from './Dado';

afterEach(cleanup);

describe('Dado', () => {
  it('muestra el valor y deshabilita el botón si no puedo tirar', () => {
    render(<Dado valor={5} puedeTirar={false} onTirar={() => {}} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect((screen.getByText('Tirar dado') as HTMLButtonElement).disabled).toBe(true);
  });

  it('tira el dado al pulsar cuando está habilitado', () => {
    const onTirar = vi.fn();
    render(<Dado valor={null} puedeTirar onTirar={onTirar} />);
    fireEvent.click(screen.getByText('Tirar dado'));
    expect(onTirar).toHaveBeenCalled();
  });
});
