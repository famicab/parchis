import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as clienteIo, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type {
  EstadoPartida,
  RespuestaCrear,
  RespuestaIniciar,
  RespuestaUnirse,
  ResumenSala,
} from '@parchis/shared';
import { crearServidor, type ServidorParchis } from '../server';

let servidor: ServidorParchis;
let url: string;
const clientes: Socket[] = [];

function nuevoCliente(): Promise<Socket> {
  const cliente = clienteIo(url, { forceNew: true });
  clientes.push(cliente);
  return new Promise((resolve) => cliente.on('connect', () => resolve(cliente)));
}

function esperar<T>(cliente: Socket, evento: string): Promise<T> {
  return new Promise((resolve) => cliente.once(evento, resolve as (...a: unknown[]) => void));
}

function crear(cliente: Socket, nombre: string): Promise<RespuestaCrear> {
  return new Promise((resolve) => cliente.emit('crear_partida', { nombre }, resolve));
}

function unir(cliente: Socket, codigo: string, nombre: string): Promise<RespuestaUnirse> {
  return new Promise((resolve) => cliente.emit('unirse_partida', { codigo, nombre }, resolve));
}

function iniciar(cliente: Socket): Promise<RespuestaIniciar> {
  return new Promise((resolve) => cliente.emit('iniciar_partida', resolve));
}

beforeAll(async () => {
  servidor = crearServidor();
  await new Promise<void>((resolve) => servidor.httpServer.listen(0, resolve));
  const { port } = servidor.httpServer.address() as AddressInfo;
  url = `http://localhost:${port}`;
});

afterEach(() => {
  clientes.forEach((c) => c.close());
  clientes.length = 0;
});

afterAll(async () => {
  servidor.detener();
  servidor.io.close();
  await new Promise<void>((resolve) => servidor.httpServer.close(() => resolve()));
});

describe('handlers de sala (integración)', () => {
  it('crear_partida responde ok y emite el lobby con 1 jugador', async () => {
    const host = await nuevoCliente();
    const lobbyPromesa = esperar<ResumenSala>(host, 'lobby_actualizado');

    const res = await crear(host, 'Ana');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.color).toBe('rojo');

    const lobby = await lobbyPromesa;
    expect(lobby.jugadores).toHaveLength(1);
    expect(lobby.fase).toBe('LOBBY');
  });

  it('unirse_partida actualiza el lobby para todos los presentes', async () => {
    const host = await nuevoCliente();
    const res = await crear(host, 'Ana');
    if (!res.ok) throw new Error('crear falló');

    const hostLobby = esperar<ResumenSala>(host, 'lobby_actualizado');
    const invitado = await nuevoCliente();
    const resUnir = await unir(invitado, res.codigo, 'Beto');

    expect(resUnir.ok).toBe(true);
    const lobby = await hostLobby;
    expect(lobby.jugadores).toHaveLength(2);
    expect(lobby.jugadores.map((j) => j.color)).toEqual(['rojo', 'azul']);
  });

  it('rechaza unirse con un código inválido', async () => {
    const cliente = await nuevoCliente();
    const res = await unir(cliente, 'mal', 'Beto');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.codigo).toBe('CODIGO_INVALIDO');
  });

  it('iniciar_partida: solo el host y con ≥2; emite partida_iniciada a todos', async () => {
    const host = await nuevoCliente();
    const res = await crear(host, 'Ana');
    if (!res.ok) throw new Error('crear falló');

    // Con 1 jugador: insuficiente.
    expect(await iniciar(host)).toMatchObject({ ok: false, error: { codigo: 'JUGADORES_INSUFICIENTES' } });

    const invitado = await nuevoCliente();
    await unir(invitado, res.codigo, 'Beto');

    // Un no-host no puede.
    expect(await iniciar(invitado)).toMatchObject({ ok: false, error: { codigo: 'NO_AUTORIZADO' } });

    // El host inicia y ambos reciben partida_iniciada.
    const partidaHost = esperar<EstadoPartida>(host, 'partida_iniciada');
    const partidaInvitado = esperar<EstadoPartida>(invitado, 'partida_iniciada');
    const resIniciar = await iniciar(host);
    expect(resIniciar.ok).toBe(true);

    const [estadoHost, estadoInvitado] = await Promise.all([partidaHost, partidaInvitado]);
    expect(estadoHost.colores).toEqual(['rojo', 'azul']);
    expect(estadoInvitado.turnoActual).toBe('rojo');
  });
});
