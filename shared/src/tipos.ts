// Modelo de estado de partida compartido entre cliente y servidor.
// Fuente de verdad: el servidor. El cliente solo dibuja este estado.
// Alineado con plans/fase-2-motor-de-juego.md §2.

export type Color = 'rojo' | 'azul' | 'amarillo' | 'verde';

export type Zona = 'GARAJE' | 'ANILLO' | 'PASILLO' | 'META';

export interface Ficha {
  id: number; // 0–3
  zona: Zona;
  casilla?: number; // si ANILLO: 0–67 (coordenada global compartida)
  paso?: number; // si PASILLO: 1–7 (casillas del pasillo propio)
}

export interface Jugador {
  id: string;
  nombre: string;
  color: Color;
  conectado: boolean;
  esHost: boolean;
}

export type FaseSala = 'LOBBY' | 'EN_CURSO' | 'TERMINADA';

/** Representación de la sala que viaja al cliente (sin datos internos como socketId). */
export interface ResumenSala {
  codigo: string;
  fase: FaseSala;
  jugadores: Jugador[];
  hostId: string;
  maxJugadores: number;
}

export type FasePartida = 'EN_CURSO' | 'TERMINADA';

export interface EstadoPartida {
  id: string;
  fase: FasePartida;
  colores: Color[]; // 2–4, en orden de turno
  turnoActual: Color;
  dado: number | null; // último valor tirado, pendiente de usar
  segundosSeises: number; // contador de 6 consecutivos (0,1,2)
  tiradaExtra: boolean; // si el turno repite
  ultimaFichaMovida: { color: Color; id: number } | null; // castigo de tres seises
  bonusPendiente: { tipo: '+20' | '+10' } | null; // bonificación manual sin resolver
  fichas: Partial<Record<Color, Ficha[]>>; // solo los colores presentes en `colores`
  ganador: Color | null;
}
