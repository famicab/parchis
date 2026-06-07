import express from 'express';
import { createServer as createHttpServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { EventosCliente, EventosServidor } from '@parchis/shared';
import { RegistroSalas } from './salas/registro';
import { registrarHandlersSala, difundirEstado } from './salas/handlers';
import { GestorTemporizadores, type OpcionesTemporizadores } from './salas/temporizadores';

export interface ServidorParchis {
  httpServer: HttpServer;
  io: Server<EventosCliente, EventosServidor>;
  registro: RegistroSalas;
  temporizadores: GestorTemporizadores;
  /** Detiene timers e intervalo de limpieza (cierre/tests). */
  detener: () => void;
}

/**
 * Construye el servidor (HTTP + Socket.IO) sin arrancar a escuchar.
 * Separado de `index.ts` para poder testearlo en un puerto efímero.
 */
export interface OpcionesServidor {
  /** Inyecta el RNG del dado (tests deterministas). Por defecto, aleatorio real. */
  lanzarDado?: () => number;
  /** Duraciones de los temporizadores de turno (tests con tiempos cortos). */
  temporizadores?: OpcionesTemporizadores;
  /** Limpieza de salas: intervalo del barrido y margen de caducidad. */
  limpieza?: { intervaloMs?: number; margenMs?: number };
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
  const temporizadores = new GestorTemporizadores(
    registro,
    (resultado) => difundirEstado(io, resultado),
    opciones.temporizadores,
  );

  io.on('connection', (socket) => {
    socket.on('ping', () => socket.emit('pong'));
    registrarHandlersSala(io, socket, registro, temporizadores);
  });

  // Barrido periódico de salas terminadas/huérfanas (PAR-405).
  const intervaloMs = opciones.limpieza?.intervaloMs ?? 60_000;
  const margenMs = opciones.limpieza?.margenMs ?? 600_000;
  const limpieza = setInterval(() => {
    for (const codigo of registro.limpiar(margenMs)) temporizadores.cancelar(codigo);
  }, intervaloMs);
  limpieza.unref?.();

  const detener = () => {
    temporizadores.detenerTodo();
    clearInterval(limpieza);
  };

  return { httpServer, io, registro, temporizadores, detener };
}
