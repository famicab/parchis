import type { Color, Jugador } from '@parchis/shared';

const COLOR_HEX: Record<Color, string> = {
  rojo: '#e2362d',
  azul: '#3366cc',
  amarillo: '#e6b800',
  verde: '#2aa54a',
};

interface Props {
  jugadores: Jugador[];
  hostId: string | null;
}

/** Presentacional: pinta la lista de jugadores con su color y marca al anfitrión. */
export function ListaJugadores({ jugadores, hostId }: Props) {
  return (
    <ul className="lista-jugadores">
      {jugadores.map((jugador) => (
        <li key={jugador.id}>
          <span
            className="ficha"
            style={{ backgroundColor: COLOR_HEX[jugador.color] }}
            aria-hidden="true"
          />
          <span className="nombre">{jugador.nombre}</span>
          {jugador.id === hostId && (
            <span className="host" title="Anfitrión" aria-label="Anfitrión">
              👑
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
