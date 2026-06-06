import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as clienteIo, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type { EventosCliente, EventosServidor } from '@parchis/shared';
import { crearServidor, type ServidorParchis } from './server';

describe('servidor base (integración)', () => {
  let servidor: ServidorParchis;
  let url: string;
  let cliente: Socket<EventosServidor, EventosCliente>;

  beforeAll(async () => {
    servidor = crearServidor();
    await new Promise<void>((resolve) => servidor.httpServer.listen(0, resolve));
    const { port } = servidor.httpServer.address() as AddressInfo;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    cliente?.close();
    servidor.io.close();
    await new Promise<void>((resolve) => servidor.httpServer.close(() => resolve()));
  });

  it('responde pong al recibir ping', async () => {
    cliente = clienteIo(url);
    const recibioPong = await new Promise<boolean>((resolve) => {
      cliente.on('connect', () => cliente.emit('ping'));
      cliente.on('pong', () => resolve(true));
    });
    expect(recibioPong).toBe(true);
  });

  it('expone GET /health con { ok: true }', async () => {
    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
