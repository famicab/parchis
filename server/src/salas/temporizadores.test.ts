import { describe, expect, it } from 'vitest';
import { io as clienteIo, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type { OpcionesTemporizadores } from './temporizadores';
import { crearServidor } from '../server';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Levanta un servidor con dado fijo en 5 y los temporizadores dados; lo limpia al terminar. */
async function conServidor(
  temporizadores: OpcionesTemporizadores,
  fn: (ctx: {
    registro: ReturnType<typeof crearServidor>['registro'];
    crear: (c: Socket, nombre: string) => Promise<{ ok: boolean; codigo?: string }>;
    nuevo: () => Promise<Socket>;
  }) => Promise<void>,
) {
  const servidor = crearServidor({ lanzarDado: () => 5, temporizadores });
  await new Promise<void>((resolve) => servidor.httpServer.listen(0, resolve));
  const url = `http://localhost:${(servidor.httpServer.address() as AddressInfo).port}`;
  const clientes: Socket[] = [];
  const nuevo = (): Promise<Socket> => {
    const c = clienteIo(url, { forceNew: true });
    clientes.push(c);
    return new Promise((resolve) => c.on('connect', () => resolve(c)));
  };
  const crear = (c: Socket, nombre: string): Promise<{ ok: boolean; codigo?: string }> =>
    new Promise((res) => c.emit('crear_partida', { nombre }, res));

  try {
    await fn({ registro: servidor.registro, crear, nuevo });
  } finally {
    clientes.forEach((c) => c.close());
    servidor.detener();
    servidor.io.close();
    await new Promise<void>((resolve) => servidor.httpServer.close(() => resolve()));
  }
}

const emitir = (c: Socket, ev: string, ...args: unknown[]): Promise<unknown> =>
  new Promise((res) => c.emit(ev, ...args, res));

async function montar(crear: (c: Socket, n: string) => Promise<{ ok: boolean; codigo?: string }>, nuevo: () => Promise<Socket>) {
  const host = await nuevo();
  const rc = await crear(host, 'Ana');
  const codigo = rc.codigo!;
  const invitado = await nuevo();
  await emitir(invitado, 'unirse_partida', { codigo, nombre: 'Beto' });
  await emitir(host, 'iniciar_partida');
  return { host, codigo };
}

describe('temporizadores de turno', () => {
  it('si el jugador no actúa, el servidor tira y mueve por él', async () => {
    await conServidor({ msTirar: 25, msMover: 25, msPasar: 15 }, async ({ registro, crear, nuevo }) => {
      const { codigo } = await montar(crear, nuevo);

      // Nadie actúa: el reloj debe auto-tirar (5) y auto-mover (saca ficha 0 del garaje).
      await sleep(120);

      const rojo0 = registro.buscar(codigo)?.partida?.fichas.rojo?.[0];
      expect(rojo0?.zona).toBe('ANILLO'); // el servidor jugó solo: la ficha ya no está en el garaje
    });
  });

  it('actuar a tiempo cancela el auto-juego y respeta la ficha elegida', async () => {
    await conServidor({ msTirar: 1000, msMover: 1000, msPasar: 1000 }, async ({ registro, crear, nuevo }) => {
      const { host, codigo } = await montar(crear, nuevo);

      // El jugador tira y mueve la ficha 2 (el auto habría movido la 0).
      await emitir(host, 'tirar_dado');
      await emitir(host, 'mover_ficha', { fichaId: 2 });

      const fichas = registro.buscar(codigo)?.partida?.fichas.rojo;
      expect(fichas?.[2]).toMatchObject({ zona: 'ANILLO', casilla: 0 }); // la elegida salió
      expect(fichas?.[0]).toMatchObject({ zona: 'GARAJE' }); // la 0 sigue en casa
    });
  });
});
