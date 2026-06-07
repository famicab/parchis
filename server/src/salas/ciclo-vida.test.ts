import { describe, expect, it } from 'vitest';
import { RegistroSalas } from './registro';

function montarJuego(registro: RegistroSalas): string {
  const { res } = registro.crear('Ana', 's1');
  if (!res.ok) throw new Error('crear falló');
  registro.unir(res.codigo, 'Beto', 's2');
  registro.iniciar('s1');
  return res.codigo;
}

const rojoDe = (registro: RegistroSalas, codigo: string) =>
  registro.buscar(codigo)!.jugadores.find((j) => j.color === 'rojo')!;

describe('PAR-405 · limpieza de salas', () => {
  it('no elimina salas recientes', () => {
    const registro = new RegistroSalas();
    const { res } = registro.crear('Ana', 's1');
    if (!res.ok) throw new Error('crear falló');
    expect(registro.limpiar(1000, Date.now())).toEqual([]);
    expect(registro.buscar(res.codigo)).toBeDefined();
  });

  it('elimina salas terminadas y caducadas', () => {
    const registro = new RegistroSalas();
    const codigo = montarJuego(registro);
    const sala = registro.buscar(codigo)!;
    sala.fase = 'TERMINADA';
    sala.actualizadaEn = 0; // muy antigua

    expect(registro.limpiar(1000)).toContain(codigo);
    expect(registro.buscar(codigo)).toBeUndefined();
  });

  it('elimina salas huérfanas (nadie conectado) caducadas', () => {
    const registro = new RegistroSalas();
    const codigo = montarJuego(registro);
    const sala = registro.buscar(codigo)!;
    sala.jugadores.forEach((j) => (j.conectado = false));
    sala.actualizadaEn = 0;

    expect(registro.limpiar(1000)).toContain(codigo);
  });
});

describe('PAR-408 · marcado de ausente', () => {
  it('marca como ausente tras varios turnos auto-jugados', () => {
    const registro = new RegistroSalas(() => 5);
    const codigo = montarJuego(registro);

    for (let i = 0; i < 100 && !rojoDe(registro, codigo).ausente; i += 1) {
      registro.autoJugar(codigo);
    }
    const rojo = rojoDe(registro, codigo);
    expect(rojo.ausente).toBe(true);
    expect(rojo.faltas).toBeGreaterThanOrEqual(3);
  });

  it('al actuar por sí mismo, deja de estar ausente', () => {
    const registro = new RegistroSalas(() => 5);
    const codigo = montarJuego(registro);
    const rojo = rojoDe(registro, codigo);
    rojo.faltas = 2;
    rojo.ausente = true;

    const res = registro.tirarDado('s1'); // es turno de rojo (host)
    expect(res.ok).toBe(true);
    expect(rojo.faltas).toBe(0);
    expect(rojo.ausente).toBe(false);
  });
});
