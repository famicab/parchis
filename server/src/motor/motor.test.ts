import { describe, expect, it } from 'vitest';
import type { EstadoPartida, Ficha } from '@parchis/shared';
import { jugadasLegales, reducir } from './motor';

const F = (id: number, zona: Ficha['zona'], extra: Partial<Ficha> = {}): Ficha => ({ id, zona, ...extra });
const garaje = (): Ficha[] => [0, 1, 2, 3].map((id) => F(id, 'GARAJE'));

function base(p: Partial<EstadoPartida> = {}): EstadoPartida {
  return {
    id: 'T',
    fase: 'EN_CURSO',
    colores: ['rojo', 'azul'],
    turnoActual: 'rojo',
    dado: null,
    segundosSeises: 0,
    tiradaExtra: false,
    ultimaFichaMovida: null,
    bonusPendiente: null,
    fichas: { rojo: garaje(), azul: garaje() },
    ganador: null,
    ...p,
  };
}

const fichaRojo = (estado: EstadoPartida, id: number) => estado.fichas.rojo!.find((f) => f.id === id)!;

describe('motor · turnos y dado', () => {
  it('rechaza acciones fuera de turno y con la partida terminada', () => {
    expect(reducir(base(), { tipo: 'TIRAR_DADO', color: 'azul', valor: 5 }).error).toBeTruthy();
    expect(reducir(base({ fase: 'TERMINADA' }), { tipo: 'TIRAR_DADO', color: 'rojo', valor: 5 }).error).toBeTruthy();
  });

  it('valida el dado y evita la doble tirada', () => {
    expect(reducir(base(), { tipo: 'TIRAR_DADO', color: 'rojo', valor: 7 }).error).toBeTruthy();
    expect(reducir(base({ dado: 3 }), { tipo: 'TIRAR_DADO', color: 'rojo', valor: 2 }).error).toBeTruthy();
  });

  it('sin jugadas legales permite pasar turno', () => {
    const r = reducir(base({ dado: 3 }), { tipo: 'PASAR_TURNO', color: 'rojo' });
    expect(r.error).toBeNull();
    expect(r.estado.turnoActual).toBe('azul');
  });

  it('no deja pasar turno si hay jugadas legales', () => {
    const estado = base({ dado: 5 }); // con un 5 se puede sacar del garaje
    expect(reducir(estado, { tipo: 'PASAR_TURNO', color: 'rojo' }).error).toBeTruthy();
  });

  it('sacar un 6 concede turno extra', () => {
    const estado = base({ dado: 6, fichas: { rojo: [F(0, 'ANILLO', { casilla: 3 }), ...garaje().slice(1)], azul: garaje() } });
    const r = reducir(estado, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(r.error).toBeNull();
    expect(r.estado.turnoActual).toBe('rojo');
    expect(r.estado.dado).toBeNull();
    expect(r.estado.tiradaExtra).toBe(true);
  });
});

describe('motor · garaje', () => {
  it('solo se sale del garaje con un 5', () => {
    expect(jugadasLegales(base({ dado: 3 }))).toEqual([]);
    expect(jugadasLegales(base({ dado: 5 }))).toEqual([0, 1, 2, 3]);
  });

  it('una barrera propia en la salida impide salir', () => {
    const estado = base({
      dado: 5,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 0 }), F(1, 'ANILLO', { casilla: 0 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
        azul: garaje(),
      },
    });
    const legales = jugadasLegales(estado);
    expect(legales).toContain(0); // las de la barrera sí pueden moverse
    expect(legales).not.toContain(2); // las del garaje no
  });

  it('sale del garaje a la salida con un 5', () => {
    const r = reducir(base({ dado: 5 }), { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(r.error).toBeNull();
    expect(fichaRojo(r.estado, 0)).toMatchObject({ zona: 'ANILLO', casilla: 0 });
    expect(r.estado.turnoActual).toBe('azul'); // un 5 no da turno extra
  });
});

describe('motor · capturas y bonificaciones', () => {
  it('comer concede +20 manual y turno extra', () => {
    const estado = base({
      dado: 3,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 5 }), ...garaje().slice(1)],
        azul: [F(0, 'ANILLO', { casilla: 8 }), ...garaje().slice(1)],
      },
    });
    const tras = reducir(estado, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(tras.error).toBeNull();
    expect(tras.estado.fichas.azul![0]).toMatchObject({ zona: 'GARAJE' }); // capturada
    expect(tras.estado.bonusPendiente).toEqual({ tipo: '+20' });
    expect(tras.estado.turnoActual).toBe('rojo');

    // Resolver el +20 sobre la misma ficha (casilla 8 → 28).
    const bonus = reducir(tras.estado, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(bonus.error).toBeNull();
    expect(fichaRojo(bonus.estado, 0)).toMatchObject({ zona: 'ANILLO', casilla: 28 });
    expect(bonus.estado.bonusPendiente).toBeNull();
    expect(bonus.estado.tiradaExtra).toBe(true);
  });

  it('no se come en un seguro', () => {
    const estado = base({
      dado: 5,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 17 }), ...garaje().slice(1)], // 17+5 = 22 (seguro)
        azul: [F(0, 'ANILLO', { casilla: 22 }), ...garaje().slice(1)],
      },
    });
    const r = reducir(estado, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(r.estado.fichas.azul![0]).toMatchObject({ zona: 'ANILLO', casilla: 22 }); // sigue ahí
    expect(r.estado.bonusPendiente).toBeNull();
  });

  it('al salir del garaje se come al rival en la propia salida', () => {
    const estado = base({
      dado: 5,
      fichas: { rojo: garaje(), azul: [F(0, 'ANILLO', { casilla: 0 }), ...garaje().slice(1)] },
    });
    const r = reducir(estado, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(r.estado.fichas.azul![0]).toMatchObject({ zona: 'GARAJE' });
    expect(r.estado.bonusPendiente).toEqual({ tipo: '+20' });
  });

  it('llegar a meta exige cuenta exacta y da +10', () => {
    const conMeta = base({
      dado: 3,
      fichas: {
        rojo: [F(0, 'PASILLO', { paso: 5 }), F(1, 'ANILLO', { casilla: 10 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
        azul: garaje(),
      },
    });
    // paso 5 = avance 68; +3 = 71 = meta exacta.
    const r = reducir(conMeta, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 0 });
    expect(fichaRojo(r.estado, 0)).toMatchObject({ zona: 'META' });
    expect(r.estado.bonusPendiente).toEqual({ tipo: '+10' });

    // pasarse de meta es ilegal
    const pasarse = base({ dado: 4, fichas: { rojo: [F(0, 'PASILLO', { paso: 5 }), ...garaje().slice(1)], azul: garaje() } });
    expect(jugadasLegales(pasarse)).toEqual([]); // 68+4 = 72 > meta
  });
});

describe('motor · barreras', () => {
  it('una barrera ajena bloquea el paso y el aterrizaje', () => {
    const estado = base({
      dado: 4,
      fichas: {
        rojo: [F(0, 'ANILLO', { casilla: 8 }), ...garaje().slice(1)],
        azul: [F(0, 'ANILLO', { casilla: 10 }), F(1, 'ANILLO', { casilla: 10 }), F(2, 'GARAJE'), F(3, 'GARAJE')],
      },
    });
    // 8 -> 12 cruzaría la barrera de la casilla 10
    expect(jugadasLegales(estado)).not.toContain(0);
    // aterrizar justo en la barrera (8 -> 10) también es ilegal
    const aterrizar = base({ ...estado, dado: 2 });
    expect(jugadasLegales(aterrizar)).not.toContain(0);
    // un paso corto que no cruza la barrera sí vale (8 -> 9)
    const corto = base({ ...estado, dado: 1 });
    expect(jugadasLegales(corto)).toContain(0);
  });
});

describe('motor · tres seises', () => {
  it('al tercer 6 la última ficha movida vuelve al garaje y pasa el turno', () => {
    const estado = base({
      segundosSeises: 2,
      ultimaFichaMovida: { color: 'rojo', id: 0 },
      fichas: { rojo: [F(0, 'ANILLO', { casilla: 30 }), ...garaje().slice(1)], azul: garaje() },
    });
    const r = reducir(estado, { tipo: 'TIRAR_DADO', color: 'rojo', valor: 6 });
    expect(r.eventos).toContain('TRES_SEISES');
    expect(fichaRojo(r.estado, 0)).toMatchObject({ zona: 'GARAJE' });
    expect(r.estado.turnoActual).toBe('azul');
    expect(r.estado.segundosSeises).toBe(0);
  });

  it('el tercer 6 no saca de la meta a la última ficha', () => {
    const estado = base({
      segundosSeises: 2,
      ultimaFichaMovida: { color: 'rojo', id: 0 },
      fichas: { rojo: [F(0, 'META'), ...garaje().slice(1)], azul: garaje() },
    });
    const r = reducir(estado, { tipo: 'TIRAR_DADO', color: 'rojo', valor: 6 });
    expect(fichaRojo(r.estado, 0)).toMatchObject({ zona: 'META' });
    expect(r.estado.turnoActual).toBe('azul');
  });
});

describe('motor · victoria', () => {
  it('declara ganador cuando las 4 fichas llegan a meta', () => {
    const estado = base({
      dado: 3,
      fichas: {
        rojo: [F(0, 'META'), F(1, 'META'), F(2, 'META'), F(3, 'PASILLO', { paso: 5 })],
        azul: garaje(),
      },
    });
    const r = reducir(estado, { tipo: 'MOVER_FICHA', color: 'rojo', fichaId: 3 });
    expect(r.estado.fase).toBe('TERMINADA');
    expect(r.estado.ganador).toBe('rojo');
    expect(r.eventos).toContain('VICTORIA');
  });
});
