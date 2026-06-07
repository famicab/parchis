import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as clienteIo, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type { EstadoPartida, RespuestaCrear, RespuestaReconexion } from '@parchis/shared';
import { crearServidor, type ServidorParchis } from '../server';

let servidor: ServidorParchis;
let url: string;
const clientes: Socket[] = [];

function nuevoCliente(): Promise<Socket> {
  const cliente = clienteIo(url, { forceNew: true });
  clientes.push(cliente);
  return new Promise((resolve) => cliente.on('connect', () => resolve(cliente)));
}
const esperar = <T>(c: Socket, ev: string): Promise<T> =>
  new Promise((resolve) => c.once(ev, resolve as (...a: unknown[]) => void));
const crear = (c: Socket, nombre: string): Promise<RespuestaCrear> =>
  new Promise((res) => c.emit('crear_partida', { nombre }, res));
const unir = (c: Socket, codigo: string, nombre: string): Promise<unknown> =>
  new Promise((res) => c.emit('unirse_partida', { codigo, nombre }, res));
const iniciar = (c: Socket): Promise<unknown> => new Promise((res) => c.emit('iniciar_partida', res));
const reconectar = (c: Socket, codigo: string, jugadorId: string): Promise<RespuestaReconexion> =>
  new Promise((res) => c.emit('reconectar', { codigo, jugadorId }, res));

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function esperarHasta(cond: () => boolean, ms = 1000) {
  const fin = Date.now() + ms;
  while (!cond() && Date.now() < fin) await sleep(10);
}

beforeAll(async () => {
  servidor = crearServidor();
  await new Promise<void>((resolve) => servidor.httpServer.listen(0, resolve));
  url = `http://localhost:${(servidor.httpServer.address() as AddressInfo).port}`;
});

afterEach(() => {
  clientes.forEach((c) => c.close());
  clientes.length = 0;
});

afterAll(async () => {
  servidor.temporizadores.detenerTodo();
  servidor.io.close();
  await new Promise<void>((resolve) => servidor.httpServer.close(() => resolve()));
});

async function montarPartida() {
  const host = await nuevoCliente();
  const rc = await crear(host, 'Ana');
  if (!rc.ok) throw new Error('crear falló');
  const invitado = await nuevoCliente();
  await unir(invitado, rc.codigo, 'Beto');
  await iniciar(host);
  return { host, invitado, codigo: rc.codigo, jugadorId: rc.jugadorId };
}

describe('reconexión en partida', () => {
  it('al desconectarse en partida NO se quita al jugador, solo se marca', async () => {
    const { host, codigo, jugadorId } = await montarPartida();
    host.close();

    const sala = () => servidor.registro.buscar(codigo);
    await esperarHasta(() => sala()?.jugadores.find((j) => j.id === jugadorId)?.conectado === false);

    expect(sala()?.jugadores).toHaveLength(2); // sigue en la sala
    expect(sala()?.jugadores.find((j) => j.id === jugadorId)?.conectado).toBe(false);
  });

  it('un socket nuevo reconecta y recibe el snapshot de la partida', async () => {
    const { host, codigo, jugadorId } = await montarPartida();
    host.close();
    const sala = () => servidor.registro.buscar(codigo);
    await esperarHasta(() => sala()?.jugadores.find((j) => j.id === jugadorId)?.conectado === false);

    const nuevo = await nuevoCliente();
    const snapshot = esperar<{ estado: EstadoPartida; jugadasLegales: number[] }>(nuevo, 'estado_actualizado');
    const r = await reconectar(nuevo, codigo, jugadorId);

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.color).toBe('rojo');
      expect(r.fase).toBe('EN_CURSO');
    }
    const snap = await snapshot;
    expect(snap.estado.colores).toEqual(['rojo', 'azul']);
    expect(sala()?.jugadores.find((j) => j.id === jugadorId)?.conectado).toBe(true);
  });

  it('rechaza reconectar con un jugadorId desconocido', async () => {
    const { codigo } = await montarPartida();
    const nuevo = await nuevoCliente();
    const r = await reconectar(nuevo, codigo, 'no-existe');
    expect(r.ok).toBe(false);
  });
});
