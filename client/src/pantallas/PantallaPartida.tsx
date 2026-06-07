import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSala } from '../sala/SalaContext';
import { Tablero } from '../components/Tablero';
import { Dado } from '../components/Dado';
import { TurnoActual } from '../components/TurnoActual';
import { Temporizador } from '../components/Temporizador';
import { Avisos } from '../components/Avisos';
import { ModalVictoria } from '../components/ModalVictoria';

/** PAR-305..310: tablero, dado, interacción y victoria. El estado lo dirige el servidor. */
export function PantallaPartida() {
  const {
    estadoPartida,
    jugadasLegales,
    ganador,
    miColor,
    esMiTurno,
    jugadores,
    turnoDesde,
    ultimosEventos,
    tirarDado,
    moverFicha,
    pasarTurno,
  } = useSala();
  const navigate = useNavigate();

  // Sin partida (p. ej. reconexión en curso): esperar el snapshot; si no llega, volver.
  useEffect(() => {
    if (estadoPartida) return;
    const id = setTimeout(() => navigate('/', { replace: true }), 4000);
    return () => clearTimeout(id);
  }, [estadoPartida, navigate]);

  const jugables = useMemo(() => new Set(jugadasLegales), [jugadasLegales]);
  if (!estadoPartida) return <p className="cargando">Cargando partida…</p>;

  const puedeTirar = esMiTurno && estadoPartida.dado === null && estadoPartida.bonusPendiente === null;
  const debeMover = esMiTurno && (estadoPartida.dado !== null || estadoPartida.bonusPendiente !== null);
  const sinJugadas = debeMover && jugadasLegales.length === 0;

  return (
    <section className="partida">
      <Tablero
        estado={estadoPartida}
        jugables={jugables}
        esMiTurno={esMiTurno}
        miColor={miColor}
        onMover={moverFicha}
      />

      <aside className="panel">
        <TurnoActual estado={estadoPartida} miColor={miColor} jugadores={jugadores} />
        {estadoPartida.fase === 'EN_CURSO' && <Temporizador estado={estadoPartida} desde={turnoDesde} />}
        <Dado valor={estadoPartida.dado} puedeTirar={puedeTirar} onTirar={tirarDado} />

        {esMiTurno && estadoPartida.bonusPendiente && (
          <p className="aviso">Bonificación {estadoPartida.bonusPendiente.tipo}: elige una ficha resaltada.</p>
        )}
        {debeMover && jugadasLegales.length > 0 && !estadoPartida.bonusPendiente && (
          <p className="aviso">Elige una ficha resaltada para mover.</p>
        )}
        {sinJugadas && (
          <div className="aviso">
            Sin jugadas posibles.{' '}
            <button type="button" onClick={pasarTurno}>
              Pasar turno
            </button>
          </div>
        )}
        {!esMiTurno && <p className="aviso">Esperando al rival…</p>}
      </aside>

      <Avisos eventos={ultimosEventos} trigger={turnoDesde} />
      {ganador && <ModalVictoria ganador={ganador} miColor={miColor} onSalir={() => navigate('/')} />}
    </section>
  );
}
