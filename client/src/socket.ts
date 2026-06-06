import { io, type Socket } from 'socket.io-client';
import type { EventosCliente, EventosServidor } from '@parchis/shared';

// El cliente ESCUCHA los eventos del servidor y EMITE los del cliente.
// (Invertido respecto al servidor, que es Server<EventosCliente, EventosServidor>.)
export const socket: Socket<EventosServidor, EventosCliente> = io(
  import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001',
  { autoConnect: true },
);
