import { describe, expect, it } from 'vitest';
import { RegistroSalas } from './registro';

function crearConHost(registro: RegistroSalas, nombre = 'Ana', socket = 'sock-host') {
  const { res } = registro.crear(nombre, socket);
  if (!res.ok) throw new Error('crear debería tener éxito');
  return res;
}

describe('RegistroSalas', () => {
  it('crea una sala con el creador como host y color rojo', () => {
    const registro = new RegistroSalas();
    const res = crearConHost(registro);
    const sala = registro.buscar(res.codigo);
    expect(sala?.fase).toBe('LOBBY');
    expect(sala?.jugadores).toHaveLength(1);
    expect(res.color).toBe('rojo');
    expect(sala?.hostId).toBe(res.jugadorId);
    expect(sala?.jugadores[0].esHost).toBe(true);
  });

  it('rechaza crear con nombre inválido', () => {
    const registro = new RegistroSalas();
    const { res } = registro.crear('   ', 'sock');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.codigo).toBe('NOMBRE_INVALIDO');
  });

  it('asigna el siguiente color libre al unirse', () => {
    const registro = new RegistroSalas();
    const host = crearConHost(registro);
    const { res } = registro.unir(host.codigo, 'Beto', 'sock-2');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.color).toBe('azul');
  });

  it('rechaza unirse a una sala llena (5º jugador)', () => {
    const registro = new RegistroSalas();
    const host = crearConHost(registro);
    registro.unir(host.codigo, 'B', 'sock-2');
    registro.unir(host.codigo, 'C', 'sock-3');
    registro.unir(host.codigo, 'D', 'sock-4');
    const { res } = registro.unir(host.codigo, 'E', 'sock-5');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.codigo).toBe('SALA_LLENA');
  });

  it('rechaza unirse con código inexistente o inválido', () => {
    const registro = new RegistroSalas();
    expect(registro.unir('ZZZZZZ', 'B', 's').res).toMatchObject({
      ok: false,
      error: { codigo: 'SALA_NO_EXISTE' },
    });
    expect(registro.unir('mal', 'B', 's').res).toMatchObject({
      ok: false,
      error: { codigo: 'CODIGO_INVALIDO' },
    });
  });

  it('rechaza unirse a una partida ya iniciada', () => {
    const registro = new RegistroSalas();
    const host = crearConHost(registro);
    registro.unir(host.codigo, 'B', 'sock-2');
    registro.iniciar('sock-host');
    const { res } = registro.unir(host.codigo, 'C', 'sock-3');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.codigo).toBe('SALA_EN_CURSO');
  });

  it('solo el host puede iniciar y con al menos 2 jugadores', () => {
    const registro = new RegistroSalas();
    const host = crearConHost(registro);

    // Con 1 jugador no se puede.
    expect(registro.iniciar('sock-host').res).toMatchObject({
      ok: false,
      error: { codigo: 'JUGADORES_INSUFICIENTES' },
    });

    registro.unir(host.codigo, 'Beto', 'sock-2');

    // Un no-host no puede.
    expect(registro.iniciar('sock-2').res).toMatchObject({
      ok: false,
      error: { codigo: 'NO_AUTORIZADO' },
    });

    // El host sí.
    const { res, sala } = registro.iniciar('sock-host');
    expect(res.ok).toBe(true);
    expect(sala?.fase).toBe('EN_CURSO');
    expect(sala?.partida?.colores).toEqual(['rojo', 'azul']);
    expect(sala?.partida?.turnoActual).toBe('rojo');
    expect(sala?.partida?.fichas.rojo).toHaveLength(4);
    expect(sala?.partida?.fichas.rojo?.every((f) => f.zona === 'GARAJE')).toBe(true);
  });

  it('al desconectarse el host, migra el host al siguiente jugador', () => {
    const registro = new RegistroSalas();
    const host = crearConHost(registro);
    const segundo = registro.unir(host.codigo, 'Beto', 'sock-2');
    if (!segundo.res.ok) throw new Error('unir debería tener éxito');

    const { sala } = registro.desconectar('sock-host');
    expect(sala?.jugadores).toHaveLength(1);
    expect(sala?.hostId).toBe(segundo.res.jugadorId);
    expect(sala?.jugadores[0].esHost).toBe(true);
  });

  it('elimina la sala cuando se va el último jugador', () => {
    const registro = new RegistroSalas();
    const host = crearConHost(registro);
    expect(registro.numeroDeSalas).toBe(1);
    registro.desconectar('sock-host');
    expect(registro.numeroDeSalas).toBe(0);
    expect(registro.buscar(host.codigo)).toBeUndefined();
  });
});
