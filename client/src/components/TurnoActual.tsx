import type { Color, EstadoPartida, Jugador } from '@parchis/shared';
import { COLOR_HEX } from '../tablero/colores';

interface Props {
  estado: EstadoPartida;
  miColor: Color | null;
  jugadores: Jugador[];
}

function etiquetaPresencia(jugador: Jugador | undefined): string {
  if (!jugador) return '';
  if (!jugador.conectado) return ' (desconectado)';
  if (jugador.ausente) return ' (ausente)';
  return '';
}

/** Indica de quién es el turno y el estado (conexión/ausencia) de cada jugador. */
export function TurnoActual({ estado, miColor, jugadores }: Props) {
  const porColor = (color: Color) => jugadores.find((j) => j.color === color);

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
            {etiquetaPresencia(porColor(color))}
          </li>
        ))}
      </ul>
    </div>
  );
}
