import { randomUUID } from 'node:crypto';
import type { Color, EstadoPartida, FaseSala, Jugador, ResumenSala } from '@parchis/shared';

export const COLORES: Color[] = ['rojo', 'azul', 'amarillo', 'verde'];
export const MAX_JUGADORES = 4;
export const MIN_PARA_EMPEZAR = 2;
export const LIMITE_NOMBRE = 20;

/** Jugador con datos internos (socketId, faltas) que NO se serializan al cliente. */
export interface JugadorInterno extends Jugador {
  socketId: string;
  ausente: boolean;
  faltas: number; // turnos auto-jugados consecutivos
}

export const FALTAS_PARA_AUSENTE = 3;

export interface SalaInterna {
  codigo: string;
  fase: FaseSala;
  jugadores: JugadorInterno[];
  hostId: string;
  partida: EstadoPartida | null;
  creadaEn: number;
  actualizadaEn: number;
}

export function primerColorLibre(usados: Color[]): Color | null {
  return COLORES.find((color) => !usados.includes(color)) ?? null;
}

export function crearJugador(
  nombre: string,
  color: Color,
  socketId: string,
  esHost: boolean,
): JugadorInterno {
  return { id: randomUUID(), nombre, color, conectado: true, esHost, socketId, ausente: false, faltas: 0 };
}

export function estaLlena(sala: SalaInterna): boolean {
  return sala.jugadores.length >= MAX_JUGADORES;
}

export function puedeEmpezar(sala: SalaInterna): boolean {
  return sala.fase === 'LOBBY' && sala.jugadores.length >= MIN_PARA_EMPEZAR;
}

/** Despoja al jugador de los campos internos antes de enviarlo al cliente. */
export function aJugadorPublico(jugador: JugadorInterno): Jugador {
  return {
    id: jugador.id,
    nombre: jugador.nombre,
    color: jugador.color,
    conectado: jugador.conectado,
    esHost: jugador.esHost,
    ausente: jugador.ausente,
  };
}

export function resumenSala(sala: SalaInterna): ResumenSala {
  return {
    codigo: sala.codigo,
    fase: sala.fase,
    jugadores: sala.jugadores.map(aJugadorPublico),
    hostId: sala.hostId,
    maxJugadores: MAX_JUGADORES,
  };
}

const CODIGO_DEL = 0x7f;
const ULTIMO_CONTROL = 0x1f;

/** Valida y sanea un nombre: requerido, 1–20 chars, sin caracteres de control. */
export function validarNombre(nombre: unknown): { ok: true; nombre: string } | { ok: false } {
  if (typeof nombre !== 'string') return { ok: false };
  const limpio = Array.from(nombre)
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo > ULTIMO_CONTROL && codigo !== CODIGO_DEL;
    })
    .join('')
    .trim();
  if (limpio.length < 1 || limpio.length > LIMITE_NOMBRE) return { ok: false };
  return { ok: true, nombre: limpio };
}
