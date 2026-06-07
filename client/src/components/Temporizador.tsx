import { useEffect, useState } from 'react';
import type { EstadoPartida } from '@parchis/shared';

// Ventana del turno (aproximación cliente; el servidor es el autoritativo).
function ventanaMs(estado: EstadoPartida): number {
  return estado.dado === null && estado.bonusPendiente === null ? 15000 : 30000;
}

interface Props {
  estado: EstadoPartida;
  desde: number;
}

/** Cuenta atrás del turno (solo visual; el auto-juego lo decide el servidor). */
export function Temporizador({ estado, desde }: Props) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const restante = Math.max(0, Math.ceil((ventanaMs(estado) - (ahora - desde)) / 1000));
  return (
    <p className="cuenta-atras" aria-label={`Tiempo de turno: ${restante} segundos`}>
      ⏱ {restante}s
    </p>
  );
}
