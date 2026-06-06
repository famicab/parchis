import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Color,
  EstadoPartida,
  FaseSala,
  Jugador,
  RespuestaCrear,
  RespuestaIniciar,
  RespuestaUnirse,
  ResumenSala,
} from '@parchis/shared';
import { socket } from '../socket';

interface SalaContextValue {
  codigo: string | null;
  jugadorId: string | null;
  miColor: Color | null;
  jugadores: Jugador[];
  hostId: string | null;
  fase: FaseSala | null;
  estadoPartida: EstadoPartida | null;
  soyHost: boolean;
  crearPartida: (nombre: string) => Promise<RespuestaCrear>;
  unirsePartida: (codigo: string, nombre: string) => Promise<RespuestaUnirse>;
  iniciarPartida: () => Promise<RespuestaIniciar>;
}

const SalaContext = createContext<SalaContextValue | null>(null);
const CLAVE_SESION = 'parchis:sala';

export function SalaProvider({ children }: { children: ReactNode }) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [jugadorId, setJugadorId] = useState<string | null>(null);
  const [miColor, setMiColor] = useState<Color | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [fase, setFase] = useState<FaseSala | null>(null);
  const [estadoPartida, setEstadoPartida] = useState<EstadoPartida | null>(null);

  // El estado del lobby/partida lo dirige el servidor (regla del rol).
  useEffect(() => {
    const onLobby = (sala: ResumenSala) => {
      setCodigo(sala.codigo);
      setJugadores(sala.jugadores);
      setHostId(sala.hostId);
      setFase(sala.fase);
    };
    const onIniciada = (estado: EstadoPartida) => {
      setFase('EN_CURSO');
      setEstadoPartida(estado);
    };
    socket.on('lobby_actualizado', onLobby);
    socket.on('partida_iniciada', onIniciada);
    return () => {
      socket.off('lobby_actualizado', onLobby);
      socket.off('partida_iniciada', onIniciada);
    };
  }, []);

  const guardarIdentidad = useCallback((cod: string, id: string, color: Color) => {
    setCodigo(cod);
    setJugadorId(id);
    setMiColor(color);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ codigo: cod, jugadorId: id, color }));
  }, []);

  const crearPartida = useCallback(
    (nombre: string) =>
      new Promise<RespuestaCrear>((resolve) => {
        socket.emit('crear_partida', { nombre }, (r) => {
          if (r.ok) guardarIdentidad(r.codigo, r.jugadorId, r.color);
          resolve(r);
        });
      }),
    [guardarIdentidad],
  );

  const unirsePartida = useCallback(
    (cod: string, nombre: string) =>
      new Promise<RespuestaUnirse>((resolve) => {
        socket.emit('unirse_partida', { codigo: cod, nombre }, (r) => {
          if (r.ok) guardarIdentidad(r.codigo, r.jugadorId, r.color);
          resolve(r);
        });
      }),
    [guardarIdentidad],
  );

  const iniciarPartida = useCallback(
    () => new Promise<RespuestaIniciar>((resolve) => socket.emit('iniciar_partida', resolve)),
    [],
  );

  const value = useMemo<SalaContextValue>(
    () => ({
      codigo,
      jugadorId,
      miColor,
      jugadores,
      hostId,
      fase,
      estadoPartida,
      soyHost: jugadorId !== null && jugadorId === hostId,
      crearPartida,
      unirsePartida,
      iniciarPartida,
    }),
    [codigo, jugadorId, miColor, jugadores, hostId, fase, estadoPartida, crearPartida, unirsePartida, iniciarPartida],
  );

  return <SalaContext.Provider value={value}>{children}</SalaContext.Provider>;
}

export function useSala(): SalaContextValue {
  const ctx = useContext(SalaContext);
  if (!ctx) throw new Error('useSala debe usarse dentro de <SalaProvider>');
  return ctx;
}
