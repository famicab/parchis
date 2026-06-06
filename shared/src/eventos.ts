// Contrato de eventos WebSocket entre cliente y servidor.
// Tipar ambos extremos con estas interfaces hace que cambiar un evento
// rompa la compilación en cliente y servidor a la vez (deseable).
// Alineado con plans/backlog-mvp.md §Contrato de eventos.

import type { Color, EstadoPartida, Jugador } from './tipos';

// Cliente → Servidor
export interface EventosCliente {
  crear_partida: (p: { nombre: string }) => void;
  unirse_partida: (p: { codigo: string; nombre: string }) => void;
  iniciar_partida: () => void;
  tirar_dado: () => void;
  mover_ficha: (p: { fichaId: number }) => void;
  pasar_turno: () => void;
  ping: () => void;
}

// Servidor → Cliente
export interface EventosServidor {
  lobby_actualizado: (p: { jugadores: Jugador[] }) => void;
  partida_iniciada: (estado: EstadoPartida) => void;
  estado_actualizado: (p: { estado: EstadoPartida; eventos: string[] }) => void;
  partida_terminada: (p: { ganador: Color }) => void;
  error: (p: { codigo: string; mensaje: string }) => void;
  pong: () => void;
}
