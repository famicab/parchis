import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSala } from '../sala/SalaContext';
import { ListaJugadores } from '../components/ListaJugadores';
import { CodigoInvitacion } from '../components/CodigoInvitacion';
import { BotonEmpezar } from '../components/BotonEmpezar';

/** PAR-105: sala de espera en tiempo real. */
export function PantallaLobby() {
  const { codigo, jugadores, hostId, soyHost, fase, estadoPartida, iniciarPartida } = useSala();
  const navigate = useNavigate();

  // Acceso directo sin sala (p. ej. refresco): volver al inicio.
  useEffect(() => {
    if (!codigo) navigate('/', { replace: true });
  }, [codigo, navigate]);

  // Cuando el servidor inicia la partida, todos van al tablero.
  useEffect(() => {
    if (fase === 'EN_CURSO' && estadoPartida) navigate('/partida');
  }, [fase, estadoPartida, navigate]);

  if (!codigo) return null;

  return (
    <section className="lobby">
      <h1>Sala de espera</h1>
      <CodigoInvitacion codigo={codigo} />
      <ListaJugadores jugadores={jugadores} hostId={hostId} />
      <BotonEmpezar visible={soyHost} habilitado={jugadores.length >= 2} onEmpezar={iniciarPartida} />
      {soyHost && jugadores.length < 2 && (
        <p className="aviso">Necesitas al menos 2 jugadores para empezar.</p>
      )}
      {!soyHost && <p className="aviso">Esperando a que el anfitrión empiece…</p>}
    </section>
  );
}
