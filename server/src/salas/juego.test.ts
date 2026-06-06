import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as clienteIo, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type { EstadoPartida, RespuestaAccion, RespuestaCrear, RespuestaUnirse } from '@parchis/shared';
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
const unir = (c: Socket, codigo: string, nombre: string): Promise<RespuestaUnirse> =>
  new Promise((res) => c.emit('unirse_partida', { codigo, nombre }, res));
const iniciar = (c: Socket): Promise<unknown> => new Promise((res) => c.emit('iniciar_partida', res));
const tirar = (c: Socket): Promise<RespuestaAccion> => new Promise((res) => c.emit('tirar_dado', res));
const mover = (c: Socket, fichaId: number): Promise<RespuestaAccion> =>
  new Promise((res) => c.emit('mover_ficha', { fichaId }, res));

beforeAll(async () => {
  // Dado fijo en 5: deterministra el flujo (sacar del garaje, etc.).
  servidor = crearServidor({ lanzarDado: () => 5 });
  await new Promise<void>((resolve) => servidor.httpServer.listen(0, resolve));
  url = `http://localhost:${(servidor.httpServer.address() as AddressInfo).port}`;
});

afterEach(() => {
  clientes.forEach((c) => c.close());
  clientes.length = 0;
});

afterAll(async () => {
  servidor.io.close();
  await new Promise<void>((resolve) => servidor.httpServer.close(() => resolve()));
});

interface Actualizacion {
  estado: EstadoPartida;
  eventos: string[];
  jugadasLegales: number[];
}

async function montarPartida() {
  const host = await nuevoCliente();
  const rc = await crear(host, 'Ana');
  if (!rc.ok) throw new Error('crear falló');
  const invitado = await nuevoCliente();
  await unir(invitado, rc.codigo, 'Beto');
  const iniciada = esperar<EstadoPartida>(host, 'partida_iniciada');
  await iniciar(host);
  await iniciada;
  return { host, invitado };
}

describe('flujo de juego (motor cableado)', () => {
  it('tirar el dado difunde el estado con las jugadas legales', async () => {
    const { host, invitado } = await montarPartida();

    const enHost = esperar<Actualizacion>(host, 'estado_actualizado');
    const enInvitado = esperar<Actualizacion>(invitado, 'estado_actualizado');
    const ack = await tirar(host);
    expect(ack.ok).toBe(true);

    const [aHost, aInvitado] = await Promise.all([enHost, enInvitado]);
    expect(aHost.estado.dado).toBe(5);
    expect(aHost.jugadasLegales).toEqual([0, 1, 2, 3]); // con un 5 puede sacar las 4
    expect(aInvitado.estado.dado).toBe(5); // ambos reciben el mismo estado
  });

  it('mover una ficha la saca del garaje y pasa el turno', async () => {
    const { host } = await montarPartida();
    await tirar(host);

    const actualizado = esperar<Actualizacion>(host, 'estado_actualizado');
    const ack = await mover(host, 0);
    expect(ack.ok).toBe(true);

    const a = await actualizado;
    expect(a.estado.fichas.rojo![0]).toMatchObject({ zona: 'ANILLO', casilla: 0 });
    expect(a.estado.turnoActual).toBe('azul'); // un 5 no da turno extra
  });

  it('rechaza acciones fuera de turno (servidor autoritativo)', async () => {
    const { invitado } = await montarPartida();
    // Es turno de rojo (host); el invitado (azul) no puede tirar.
    const ack = await tirar(invitado);
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.mensaje).toMatch(/turno/i);
  });
});
