import { useEffect, useState } from 'react';

const MENSAJES: Array<[string, string]> = [
  ['VICTORIA', ''], // lo gestiona el modal de victoria
  ['COME', '¡Captura! +20 🎉'],
  ['META', '¡A meta! +10 🏁'],
  ['TRES_SEISES', '¡Tres seises! Esa ficha vuelve a empezar'],
  ['TURNO_EXTRA', 'Turno extra 🎲'],
];

export function mensajeDeEventos(eventos: string[]): string | null {
  for (const [clave, texto] of MENSAJES) {
    if (eventos.includes(clave)) return texto || null;
  }
  return null;
}

interface Props {
  eventos: string[];
  /** Cambia en cada actualización del estado para re-disparar el aviso. */
  trigger: number;
}

/** Toast breve con el evento más relevante del último cambio de estado. */
export function Avisos({ eventos, trigger }: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const texto = mensajeDeEventos(eventos);
    if (!texto) return;
    setMensaje(texto);
    const id = setTimeout(() => setMensaje(null), 1800);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!mensaje) return null;
  return (
    <div className="toast" role="status">
      {mensaje}
    </div>
  );
}
