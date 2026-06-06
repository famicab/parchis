import express from 'express';
import { createServer as createHttpServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { EventosCliente, EventosServidor } from '@parchis/shared';

export interface ServidorParchis {
  httpServer: HttpServer;
  io: Server<EventosCliente, EventosServidor>;
}

/**
 * Construye el servidor (HTTP + Socket.IO) sin arrancar a escuchar.
 * Separado de `index.ts` para poder testearlo en un puerto efímero.
 */
export function crearServidor(): ServidorParchis {
  const app = express();
  app.get('/health', (_req, res) => res.json({ ok: true }));

  const httpServer = createHttpServer(app);
  const io = new Server<EventosCliente, EventosServidor>(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN ?? '*' },
  });

  io.on('connection', (socket) => {
    socket.on('ping', () => socket.emit('pong'));
  });

  return { httpServer, io };
}
