import { crearServidor } from './server';
import { log } from './log';

const { httpServer, io, detener } = crearServidor();
const PORT = Number(process.env.PORT ?? 3001);

httpServer.listen(PORT, () => log.info('servidor arrancado', { puerto: PORT }));

// Apagado elegante: Render envía SIGTERM en cada deploy. Cerramos limpio
// (timers + sockets + http) para no dejar conexiones colgando.
let apagando = false;
function apagar(senal: string): void {
  if (apagando) return;
  apagando = true;
  log.info('apagando', { senal });
  detener();
  io.close();
  httpServer.close(() => {
    log.info('servidor cerrado');
    process.exit(0);
  });
  // Red de seguridad si algún cierre se cuelga.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));

// Red de seguridad: registrar errores no controlados sin tumbar el servidor en silencio.
process.on('uncaughtException', (err) => log.error('uncaughtException', { error: String(err) }));
process.on('unhandledRejection', (err) => log.error('unhandledRejection', { error: String(err) }));
