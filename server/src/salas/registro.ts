import type {
  CodigoError,
  ErrorSala,
  RespuestaCrear,
  RespuestaIniciar,
  RespuestaUnirse,
} from '@parchis/shared';
import { codigoValido, generarCodigoUnico, normalizarCodigo } from './codigo';
import { crearEstadoInicial } from '../partida/estadoInicial';
import {
  COLORES,
  crearJugador,
  estaLlena,
  primerColorLibre,
  puedeEmpezar,
  validarNombre,
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

/**
 * Fuente de verdad de las salas (en memoria). Mantiene un índice inverso
 * socket → sala para resolver desconexiones. Todas las validaciones viven aquí
 * (servidor autoritativo); los handlers solo traducen socket ↔ registro.
 */
export class RegistroSalas {
  private readonly salas = new Map<string, SalaInterna>();
  private readonly porSocket = new Map<string, { codigo: string; jugadorId: string }>();

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
   * Procesa la desconexión de un socket: quita al jugador, migra el host si era él
   * y elimina la sala si queda vacía. Devuelve la sala afectada para re-emitir el lobby.
   */
  desconectar(socketId: string): { sala: SalaInterna | null } {
    const ref = this.porSocket.get(socketId);
    if (!ref) return { sala: null };
    this.porSocket.delete(socketId);

    const sala = this.salas.get(ref.codigo);
    if (!sala) return { sala: null };

    sala.jugadores = sala.jugadores.filter((j) => j.id !== ref.jugadorId);
    sala.actualizadaEn = Date.now();

    if (sala.jugadores.length === 0) {
      this.salas.delete(sala.codigo);
      return { sala: null };
    }

    if (sala.hostId === ref.jugadorId) {
      sala.hostId = sala.jugadores[0].id;
      sala.jugadores[0].esHost = true;
    }
    return { sala };
  }
}
