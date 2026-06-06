import type { Server, Socket } from 'socket.io';
import type { EventosCliente, EventosServidor } from '@parchis/shared';
import type { RegistroSalas } from './registro';
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

  socket.on('disconnect', () => {
    const { sala } = registro.desconectar(socket.id);
    if (sala) {
      io.to(sala.codigo).emit('lobby_actualizado', resumenSala(sala));
    }
  });
}

/** Llama al acknowledgement solo si el cliente envió uno (entrada no confiable). */
function responder<R>(ack: ((r: R) => void) | undefined, res: R): void {
  if (typeof ack === 'function') ack(res);
}
