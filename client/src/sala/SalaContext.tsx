import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Color,
  EstadoPartida,
  FaseSala,
  Jugador,
  RespuestaCrear,
  RespuestaIniciar,
  RespuestaReconexion,
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
  jugadasLegales: number[];
  ganador: Color | null;
  turnoDesde: number; // timestamp del último cambio de estado (para la cuenta atrás)
  soyHost: boolean;
  esMiTurno: boolean;
  crearPartida: (nombre: string) => Promise<RespuestaCrear>;
  unirsePartida: (codigo: string, nombre: string) => Promise<RespuestaUnirse>;
  iniciarPartida: () => Promise<RespuestaIniciar>;
  reconectarSesion: (codigo: string, jugadorId: string) => Promise<RespuestaReconexion>;
  tirarDado: () => void;
  moverFicha: (fichaId: number) => void;
  pasarTurno: () => void;
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
  const [jugadasLegales, setJugadasLegales] = useState<number[]>([]);
  const [ganador, setGanador] = useState<Color | null>(null);
  const [turnoDesde, setTurnoDesde] = useState<number>(Date.now());

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
      setJugadasLegales([]);
      setGanador(null);
      setTurnoDesde(Date.now());
    };
    const onActualizado = (p: { estado: EstadoPartida; jugadasLegales: number[] }) => {
      setEstadoPartida(p.estado);
      setJugadasLegales(p.jugadasLegales);
      setTurnoDesde(Date.now());
    };
    const onTerminada = (p: { ganador: Color }) => setGanador(p.ganador);

    socket.on('lobby_actualizado', onLobby);
    socket.on('partida_iniciada', onIniciada);
    socket.on('estado_actualizado', onActualizado);
    socket.on('partida_terminada', onTerminada);
    return () => {
      socket.off('lobby_actualizado', onLobby);
      socket.off('partida_iniciada', onIniciada);
      socket.off('estado_actualizado', onActualizado);
      socket.off('partida_terminada', onTerminada);
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

  const reconectarSesion = useCallback(
    (cod: string, jid: string) =>
      new Promise<RespuestaReconexion>((resolve) => {
        socket.emit('reconectar', { codigo: cod, jugadorId: jid }, (r) => {
          if (r.ok) {
            setCodigo(cod);
            setJugadorId(jid);
            setMiColor(r.color);
            setFase(r.fase);
          }
          resolve(r);
        });
      }),
    [],
  );

  const tirarDado = useCallback(() => socket.emit('tirar_dado', () => {}), []);
  const moverFicha = useCallback((fichaId: number) => socket.emit('mover_ficha', { fichaId }, () => {}), []);
  const pasarTurno = useCallback(() => socket.emit('pasar_turno', () => {}), []);

  const value = useMemo<SalaContextValue>(
    () => ({
      codigo,
      jugadorId,
      miColor,
      jugadores,
      hostId,
      fase,
      estadoPartida,
      jugadasLegales,
      ganador,
      turnoDesde,
      soyHost: jugadorId !== null && jugadorId === hostId,
      esMiTurno: estadoPartida !== null && estadoPartida.turnoActual === miColor,
      crearPartida,
      unirsePartida,
      iniciarPartida,
      reconectarSesion,
      tirarDado,
      moverFicha,
      pasarTurno,
    }),
    [
      codigo,
      jugadorId,
      miColor,
      jugadores,
      hostId,
      fase,
      estadoPartida,
      jugadasLegales,
      ganador,
      turnoDesde,
      crearPartida,
      unirsePartida,
      iniciarPartida,
      reconectarSesion,
      tirarDado,
      moverFicha,
      pasarTurno,
    ],
  );

  return <SalaContext.Provider value={value}>{children}</SalaContext.Provider>;
}

export function useSala(): SalaContextValue {
  const ctx = useContext(SalaContext);
  if (!ctx) throw new Error('useSala debe usarse dentro de <SalaProvider>');
  return ctx;
}
