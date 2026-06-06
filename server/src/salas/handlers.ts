import type { Server, Socket } from 'socket.io';
import type { EventosCliente, EventosServidor, RespuestaAccion } from '@parchis/shared';
import type { RegistroSalas, ResultadoAccion } from './registro';
import { jugadasLegales } from '../motor';
import { resumenSala } from './sala';

type IO = Server<EventosCliente, EventosServidor>;
type Cliente = Socket<EventosCliente, EventosServidor>;

/**
 * Cablea los eventos de sala de un socket contra el registro autoritativo.
 * El registro decide y valida; aquí solo traducimos socket ↔ registro y emitimos.
 */
export function registrarHandlersSala(io: IO, socket: Cliente, registro: RegistroSalas): void {
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
    if (r.sala.fase === 'EN_CURSO' && r.sala.partida) {
      socket.emit('estado_actualizado', {
        estado: r.sala.partida,
        eventos: [],
        jugadasLegales: jugadasLegales(r.sala.partida),
      });
    } else {
      socket.emit('lobby_actualizado', resumenSala(r.sala));
    }
    responder(ack, { ok: true, codigo: r.sala.codigo, color: r.color, fase: r.sala.fase });
  });

  // --- acciones de juego: aplican el motor y difunden el estado ---
  socket.on('tirar_dado', (ack) => responder(ack, difundirAccion(io, registro.tirarDado(socket.id))));
  socket.on('mover_ficha', (payload, ack) =>
    responder(ack, difundirAccion(io, registro.moverFicha(socket.id, payload?.fichaId ?? -1))),
  );
  socket.on('pasar_turno', (ack) => responder(ack, difundirAccion(io, registro.pasarTurno(socket.id))));

  socket.on('disconnect', () => {
    const { sala, enPartida } = registro.desconectar(socket.id);
    // En partida no re-emitimos lobby (la presencia en juego es de PAR-407).
    if (sala && !enPartida) {
      io.to(sala.codigo).emit('lobby_actualizado', resumenSala(sala));
    }
  });
}

/** Difunde el estado a la sala si la acción tuvo éxito y devuelve la respuesta para el ack. */
function difundirAccion(io: IO, resultado: ResultadoAccion): RespuestaAccion {
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };

  const { sala, estado, eventos, jugadasLegales } = resultado;
  io.to(sala.codigo).emit('estado_actualizado', { estado, eventos, jugadasLegales });
  if (estado.fase === 'TERMINADA' && estado.ganador) {
    io.to(sala.codigo).emit('partida_terminada', { ganador: estado.ganador });
  }
  return { ok: true };
}

/** Llama al acknowledgement solo si el cliente envió uno (entrada no confiable). */
function responder<R>(ack: ((r: R) => void) | undefined, res: R): void {
  if (typeof ack === 'function') ack(res);
}
