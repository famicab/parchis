import { useSala } from '../sala/SalaContext';

/** Placeholder de la partida. El tablero y las reglas llegan en los Sprints 2 y 3. */
export function PantallaPartida() {
  const { estadoPartida } = useSala();

  return (
    <section className="partida">
      <h1>¡Partida iniciada!</h1>
      <p>El tablero llega en el Sprint 3. 🎲</p>
      {estadoPartida && (
        <p>
          Jugadores: {estadoPartida.colores.join(', ')}. Empieza: {estadoPartida.turnoActual}.
        </p>
      )}
    </section>
  );
}
