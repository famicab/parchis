import type { Color, EstadoPartida } from '@parchis/shared';
import { COLOR_HEX } from '../tablero/colores';

interface Props {
  estado: EstadoPartida;
  miColor: Color | null;
}

/** Indica de quién es el turno y los jugadores de la partida. */
export function TurnoActual({ estado, miColor }: Props) {
  return (
    <div className="turno">
      <p>
        Turno de{' '}
        <strong style={{ color: COLOR_HEX[estado.turnoActual] }}>{estado.turnoActual}</strong>
        {estado.turnoActual === miColor ? ' (tú)' : ''}
      </p>
      <ul className="jugadores-color">
        {estado.colores.map((color) => (
          <li key={color}>
            <span className="punto" style={{ backgroundColor: COLOR_HEX[color] }} aria-hidden="true" />
            {color}
            {color === miColor ? ' (tú)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
