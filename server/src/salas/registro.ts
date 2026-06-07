import type {
  CodigoError,
  Color,
  ErrorSala,
  EstadoPartida,
  RespuestaCrear,
  RespuestaIniciar,
  RespuestaUnirse,
} from '@parchis/shared';
import { codigoValido, generarCodigoUnico, normalizarCodigo } from './codigo';
import { crearEstadoInicial, elegirFichaAuto, jugadasLegales, reducir, type Accion } from '../motor';
import { lanzarDado as lanzarDadoPorDefecto } from '../partida/dado';
import {
  COLORES,
  crearJugador,
  estaLlena,
  primerColorLibre,
  puedeEmpezar,
  validarNombre,
  type JugadorInterno,
  type SalaInterna,
} from './sala';

function err(codigo: CodigoError, mensaje: string): ErrorSala {
  return { codigo, mensaje };
}

/** Resultado de una operación: la respuesta para el ack + la sala afectada (si la hay). */
interface Resultado<R> {
  res: R;
  sala?: SalaInterna;
}

/** Resultado de una acción de juego: estado nuevo a difundir, o error para el ack. */
export type ResultadoAccion =
  | { ok: true; sala: SalaInterna; estado: EstadoPartida; eventos: string[]; jugadasLegales: number[] }
  | { ok: false; mensaje: string };

/** Resultado de una reconexión: la sala y el color para enviar el snapshot. */
export type ResultadoReconexion =
  | { ok: true; sala: SalaInterna; color: Color }
  | { ok: false; mensaje: string };

/**
 * Fuente de verdad de las salas (en memoria). Mantiene un índice inverso
 * socket → sala para resolver desconexiones. Todas las validaciones viven aquí
 * (servidor autoritativo); los handlers solo traducen socket ↔ registro.
 */
export class RegistroSalas {
  private readonly salas = new Map<string, SalaInterna>();
  private readonly porSocket = new Map<string, { codigo: string; jugadorId: string }>();

  // El RNG del dado se inyecta (por defecto el real); permite tests deterministas.
  constructor(private readonly lanzarDado: () => number = lanzarDadoPorDefecto) {}

  buscar(codigo: string): SalaInterna | undefined {
    return this.salas.get(codigo);
  }

  get numeroDeSalas(): number {
    return this.salas.size;
  }

  crear(nombreRaw: unknown, socketId: string): Resultado<RespuestaCrear> {
    const nombre = validarNombre(nombreRaw);
    if (!nombre.ok) return { res: { ok: false, error: err('NOMBRE_INVALIDO', 'Nombre no válido.') } };

    const codigo = generarCodigoUnico((c) => this.salas.has(c));
    const host = crearJugador(nombre.nombre, COLORES[0], socketId, true);
    const ahora = Date.now();
    const sala: SalaInterna = {
      codigo,
      fase: 'LOBBY',
      jugadores: [host],
      hostId: host.id,
      partida: null,
      creadaEn: ahora,
      actualizadaEn: ahora,
    };

    this.salas.set(codigo, sala);
    this.porSocket.set(socketId, { codigo, jugadorId: host.id });
    return { res: { ok: true, codigo, jugadorId: host.id, color: host.color }, sala };
  }

  unir(codigoRaw: unknown, nombreRaw: unknown, socketId: string): Resultado<RespuestaUnirse> {
    if (typeof codigoRaw !== 'string') {
      return { res: { ok: false, error: err('CODIGO_INVALIDO', 'Código no válido.') } };
    }
    const codigo = normalizarCodigo(codigoRaw);
    if (!codigoValido(codigo)) {
      return { res: { ok: false, error: err('CODIGO_INVALIDO', 'Código no válido.') } };
    }

    const sala = this.salas.get(codigo);
    if (!sala) return { res: { ok: false, error: err('SALA_NO_EXISTE', 'No existe una sala con ese código.') } };
    if (sala.fase !== 'LOBBY') {
      return { res: { ok: false, error: err('SALA_EN_CURSO', 'La partida ya ha empezado.') } };
    }
    if (estaLlena(sala)) return { res: { ok: false, error: err('SALA_LLENA', 'La sala está completa.') } };

    const nombre = validarNombre(nombreRaw);
    if (!nombre.ok) return { res: { ok: false, error: err('NOMBRE_INVALIDO', 'Nombre no válido.') } };

    const color = primerColorLibre(sala.jugadores.map((j) => j.color));
    if (!color) return { res: { ok: false, error: err('SALA_LLENA', 'La sala está completa.') } };

    const jugador = crearJugador(nombre.nombre, color, socketId, false);
    sala.jugadores.push(jugador);
    sala.actualizadaEn = Date.now();
    this.porSocket.set(socketId, { codigo, jugadorId: jugador.id });
    return { res: { ok: true, codigo, jugadorId: jugador.id, color }, sala };
  }

  iniciar(socketId: string): Resultado<RespuestaIniciar> {
    const ref = this.porSocket.get(socketId);
    const sala = ref && this.salas.get(ref.codigo);
    if (!ref || !sala) {
      return { res: { ok: false, error: err('SALA_NO_EXISTE', 'No estás en ninguna sala.') } };
    }
    if (sala.hostId !== ref.jugadorId) {
      return { res: { ok: false, error: err('NO_AUTORIZADO', 'Solo el anfitrión puede empezar.') } };
    }
    if (!puedeEmpezar(sala)) {
      return { res: { ok: false, error: err('JUGADORES_INSUFICIENTES', 'Hacen falta al menos 2 jugadores.') } };
    }

    sala.fase = 'EN_CURSO';
    sala.partida = crearEstadoInicial(sala.codigo, sala.jugadores.map((j) => j.color));
    sala.actualizadaEn = Date.now();
    return { res: { ok: true }, sala };
  }

  /**
   * Procesa la desconexión de un socket.
   * - En LOBBY: quita al jugador, migra el host si era él y borra la sala vacía.
   * - En PARTIDA: NO quita; marca al jugador como desconectado para permitir reconectar.
   * `enPartida` indica el caso para que el handler sepa si re-emitir el lobby.
   */
  desconectar(socketId: string): { sala: SalaInterna | null; enPartida: boolean } {
    const ref = this.porSocket.get(socketId);
    if (!ref) return { sala: null, enPartida: false };
    this.porSocket.delete(socketId);

    const sala = this.salas.get(ref.codigo);
    if (!sala) return { sala: null, enPartida: false };
    sala.actualizadaEn = Date.now();

    if (sala.fase === 'EN_CURSO') {
      const jugador = sala.jugadores.find((j) => j.id === ref.jugadorId);
      if (jugador) jugador.conectado = false;
      return { sala, enPartida: true };
    }

    sala.jugadores = sala.jugadores.filter((j) => j.id !== ref.jugadorId);
    if (sala.jugadores.length === 0) {
      this.salas.delete(sala.codigo);
      return { sala: null, enPartida: false };
    }
    if (sala.hostId === ref.jugadorId) {
      sala.hostId = sala.jugadores[0].id;
      sala.jugadores[0].esHost = true;
    }
    return { sala, enPartida: false };
  }

  /**
   * Re-vincula un socket nuevo a un jugador existente (reconexión). Devuelve la sala
   * y el color para que el handler envíe el snapshot adecuado (lobby o partida).
   */
  reconectar(socketId: string, codigoRaw: unknown, jugadorId: unknown): ResultadoReconexion {
    if (typeof codigoRaw !== 'string' || typeof jugadorId !== 'string') {
      return { ok: false, mensaje: 'Datos de reconexión no válidos.' };
    }
    const sala = this.salas.get(normalizarCodigo(codigoRaw));
    if (!sala) return { ok: false, mensaje: 'La sala ya no existe.' };

    const jugador = sala.jugadores.find((j) => j.id === jugadorId);
    if (!jugador) return { ok: false, mensaje: 'Tu sitio ya no está en la sala.' };

    jugador.conectado = true;
    jugador.socketId = socketId;
    this.porSocket.set(socketId, { codigo: sala.codigo, jugadorId });
    sala.actualizadaEn = Date.now();
    return { ok: true, sala, color: jugador.color };
  }

  // --------------------------- acciones de juego ---------------------------

  tirarDado(socketId: string): ResultadoAccion {
    return this.aplicarAccion(socketId, (color) => ({ tipo: 'TIRAR_DADO', color, valor: this.lanzarDado() }));
  }

  moverFicha(socketId: string, fichaId: number): ResultadoAccion {
    return this.aplicarAccion(socketId, (color) => ({ tipo: 'MOVER_FICHA', color, fichaId }));
  }

  pasarTurno(socketId: string): ResultadoAccion {
    return this.aplicarAccion(socketId, (color) => ({ tipo: 'PASAR_TURNO', color }));
  }

  private resolver(socketId: string): { sala: SalaInterna; jugador: JugadorInterno } | null {
    const ref = this.porSocket.get(socketId);
    const sala = ref && this.salas.get(ref.codigo);
    if (!ref || !sala) return null;
    const jugador = sala.jugadores.find((j) => j.id === ref.jugadorId);
    return jugador ? { sala, jugador } : null;
  }

  /** Aplica una acción de juego con el color del jugador del socket (servidor autoritativo). */
  private aplicarAccion(socketId: string, construir: (color: Color) => Accion): ResultadoAccion {
    const ctx = this.resolver(socketId);
    if (!ctx || !ctx.sala.partida) return { ok: false, mensaje: 'No estás en una partida.' };
    return this.aplicarEnSala(ctx.sala, construir(ctx.jugador.color));
  }

  private aplicarEnSala(sala: SalaInterna, accion: Accion): ResultadoAccion {
    if (!sala.partida) return { ok: false, mensaje: 'No hay partida en curso.' };
    const { estado, eventos, error } = reducir(sala.partida, accion);
    if (error) return { ok: false, mensaje: error };

    sala.partida = estado;
    sala.actualizadaEn = Date.now();
    return { ok: true, sala, estado, eventos, jugadasLegales: jugadasLegales(estado) };
  }

  salaPorCodigo(codigo: string): SalaInterna | undefined {
    return this.salas.get(codigo);
  }

  /** Juega automáticamente por el jugador en turno (timeout/AFK): tira, mueve o pasa. */
  autoJugar(codigo: string): ResultadoAccion | null {
    const sala = this.salas.get(codigo);
    if (!sala || !sala.partida || sala.partida.fase !== 'EN_CURSO') return null;

    const estado = sala.partida;
    const color = estado.turnoActual;
    if (estado.dado === null && estado.bonusPendiente === null) {
      return this.aplicarEnSala(sala, { tipo: 'TIRAR_DADO', color, valor: this.lanzarDado() });
    }
    const fichaId = elegirFichaAuto(estado);
    if (fichaId === null) return this.aplicarEnSala(sala, { tipo: 'PASAR_TURNO', color });
    return this.aplicarEnSala(sala, { tipo: 'MOVER_FICHA', color, fichaId });
  }
}
