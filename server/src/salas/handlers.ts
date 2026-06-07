import type { Server, Socket } from 'socket.io';
import type { EventosCliente, EventosServidor, RespuestaAccion } from '@parchis/shared';
import type { RegistroSalas, ResultadoAccion } from './registro';
import type { GestorTemporizadores } from './temporizadores';
import { jugadasLegales } from '../motor';
import { resumenSala } from './sala';

type IO = Server<EventosCliente, EventosServidor>;
type Cliente = Socket<EventosCliente, EventosServidor>;

/**
 * Cablea los eventos de sala de un socket contra el registro autoritativo.
 * El registro decide y valida; aquí solo traducimos socket ↔ registro y emitimos.
 */
export function registrarHandlersSala(
  io: IO,
  socket: Cliente,
  registro: RegistroSalas,
  temporizadores: GestorTemporizadores,
): void {
  // Difunde el resultado de una acción de juego y re-arma el temporizador de turno.
  const procesar = (resultado: ResultadoAccion): RespuestaAccion => {
    if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };
    difundirEstado(io, resultado);
    temporizadores.reprogramar(resultado.sala.codigo);
    return { ok: true };
  };

  socket.on('crear_partida', (payload, ack) => {
    const { res, sala } = registro.crear(payload?.nombre, socket.id);
    if (res.ok && sala) {
      socket.join(sala.codigo);
      io.to(sala.codigo).emit('lobby_actualizado', resumenSala(sala));
    }
    responder(ack, res);
  });

  socket.on('unirse_partida', (payload, ack) => {
    const { res, sala } = registro.unir(payload?.codigo, payload?.nombre, socket.id);
    if (res.ok && sala) {
      socket.join(sala.codigo);
      io.to(sala.codigo).emit('lobby_actualizado', resumenSala(sala));
    }
    responder(ack, res);
  });

  socket.on('iniciar_partida', (ack) => {
    const { res, sala } = registro.iniciar(socket.id);
    if (res.ok && sala?.partida) {
      io.to(sala.codigo).emit('partida_iniciada', sala.partida);
      temporizadores.reprogramar(sala.codigo); // arranca el reloj del primer turno
    }
    responder(ack, res);
  });

  // Reconexión: re-vincula el socket y envía un snapshot solo a quien vuelve.
  socket.on('reconectar', (payload, ack) => {
    const r = registro.reconectar(socket.id, payload?.codigo, payload?.jugadorId);
    if (!r.ok) {
      responder(ack, { ok: false, mensaje: r.mensaje });
      return;
    }
    socket.join(r.sala.codigo);
    // Snapshot del tablero solo a quien vuelve (si hay partida)...
    if (r.sala.fase === 'EN_CURSO' && r.sala.partida) {
      socket.emit('estado_actualizado', {
        estado: r.sala.partida,
        eventos: [],
        jugadasLegales: jugadasLegales(r.sala.partida),
      });
    }
    // ...y presencia a toda la sala (incluye el snapshot de lobby para el que vuelve).
    io.to(r.sala.codigo).emit('lobby_actualizado', resumenSala(r.sala));
    responder(ack, { ok: true, codigo: r.sala.codigo, color: r.color, fase: r.sala.fase });
  });

  // --- acciones de juego: aplican el motor, difunden el estado y re-arman el reloj ---
  socket.on('tirar_dado', (ack) => responder(ack, procesar(registro.tirarDado(socket.id))));
  socket.on('mover_ficha', (payload, ack) =>
    responder(ack, procesar(registro.moverFicha(socket.id, payload?.fichaId ?? -1))),
  );
  socket.on('pasar_turno', (ack) => responder(ack, procesar(registro.pasarTurno(socket.id))));

  socket.on('disconnect', () => {
    const { sala } = registro.desconectar(socket.id);
    // Difunde la presencia (en lobby quita al jugador; en partida lo marca desconectado).
    if (sala) {
      io.to(sala.codigo).emit('lobby_actualizado', resumenSala(sala));
    }
  });
}

/** Difunde el nuevo estado a la sala (lo usan tanto las acciones de jugador como el auto-juego). */
export function difundirEstado(io: IO, resultado: ResultadoAccion): void {
  if (!resultado.ok) return;
  const { sala, estado, eventos, jugadasLegales } = resultado;
  io.to(sala.codigo).emit('estado_actualizado', { estado, eventos, jugadasLegales });
  if (estado.fase === 'TERMINADA' && estado.ganador) {
    io.to(sala.codigo).emit('partida_terminada', { ganador: estado.ganador });
  }
}

/** Llama al acknowledgement solo si el cliente envió uno (entrada no confiable). */
function responder<R>(ack: ((r: R) => void) | undefined, res: R): void {
  if (typeof ack === 'function') ack(res);
}
