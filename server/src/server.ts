import express from 'express';
import { createServer as createHttpServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { EventosCliente, EventosServidor } from '@parchis/shared';
import { RegistroSalas } from './salas/registro';
import { registrarHandlersSala } from './salas/handlers';

export interface ServidorParchis {
  httpServer: HttpServer;
  io: Server<EventosCliente, EventosServidor>;
  registro: RegistroSalas;
}

/**
 * Construye el servidor (HTTP + Socket.IO) sin arrancar a escuchar.
 * Separado de `index.ts` para poder testearlo en un puerto efímero.
 */
export interface OpcionesServidor {
  /** Inyecta el RNG del dado (tests deterministas). Por defecto, aleatorio real. */
  lanzarDado?: () => number;
}

export function crearServidor(opciones: OpcionesServidor = {}): ServidorParchis {
  const app = express();
  app.get('/health', (_req, res) => res.json({ ok: true }));

  const httpServer = createHttpServer(app);

  const clientOrigin = process.env.CLIENT_ORIGIN;
  if (!clientOrigin && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[seguridad] CLIENT_ORIGIN no definido en producción: el CORS aceptará cualquier origen. ' +
        'Define CLIENT_ORIGIN con el dominio del frontend para restringirlo.',
    );
  }

  const io = new Server<EventosCliente, EventosServidor>(httpServer, {
    cors: { origin: clientOrigin ?? '*' },
  });

  const registro = new RegistroSalas(opciones.lanzarDado);

  io.on('connection', (socket) => {
    socket.on('ping', () => socket.emit('pong'));
    registrarHandlersSala(io, socket, registro);
  });

  return { httpServer, io, registro };
}
