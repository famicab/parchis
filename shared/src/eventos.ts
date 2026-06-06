// Contrato de eventos WebSocket entre cliente y servidor.
// Tipar ambos extremos con estas interfaces hace que cambiar un evento
// rompa la compilación en cliente y servidor a la vez (deseable).
// Alineado con plans/sprint-1-salas-y-lobby.md §6.

import type { Color, EstadoPartida, ResumenSala } from './tipos';

// --- Errores de sala -------------------------------------------------------

export type CodigoError =
  | 'CODIGO_INVALIDO'
  | 'SALA_NO_EXISTE'
  | 'SALA_EN_CURSO'
  | 'SALA_LLENA'
  | 'NOMBRE_INVALIDO'
  | 'NO_AUTORIZADO'
  | 'JUGADORES_INSUFICIENTES';

export interface ErrorSala {
  codigo: CodigoError;
  mensaje: string;
}

// --- Respuestas (acknowledgements de Socket.IO) ----------------------------

export type RespuestaCrear =
  | { ok: true; codigo: string; jugadorId: string; color: Color }
  | { ok: false; error: ErrorSala };

export type RespuestaUnirse =
  | { ok: true; codigo: string; jugadorId: string; color: Color }
  | { ok: false; error: ErrorSala };

export type RespuestaIniciar = { ok: true } | { ok: false; error: ErrorSala };

/** Resultado de una acción de juego (tirar/mover/pasar). El estado llega por broadcast. */
export type RespuestaAccion = { ok: true } | { ok: false; mensaje: string };

// --- Eventos ---------------------------------------------------------------

// Cliente → Servidor (todas responden por acknowledgement)
export interface EventosCliente {
  crear_partida: (p: { nombre: string }, ack: (r: RespuestaCrear) => void) => void;
  unirse_partida: (p: { codigo: string; nombre: string }, ack: (r: RespuestaUnirse) => void) => void;
  iniciar_partida: (ack: (r: RespuestaIniciar) => void) => void;
  tirar_dado: (ack: (r: RespuestaAccion) => void) => void;
  mover_ficha: (p: { fichaId: number }, ack: (r: RespuestaAccion) => void) => void;
  pasar_turno: (ack: (r: RespuestaAccion) => void) => void;
  ping: () => void;
}

// Servidor → Cliente
export interface EventosServidor {
  lobby_actualizado: (sala: ResumenSala) => void;
  partida_iniciada: (estado: EstadoPartida) => void;
  estado_actualizado: (p: { estado: EstadoPartida; eventos: string[]; jugadasLegales: number[] }) => void;
  partida_terminada: (p: { ganador: Color }) => void;
  error: (p: { codigo: string; mensaje: string }) => void;
  pong: () => void;
}
