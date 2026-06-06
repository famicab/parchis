import { useState } from 'react';

interface Props {
  codigo: string;
}

/** Muestra el código y permite copiar un enlace de invitación compartible. */
export function CodigoInvitacion({ codigo }: Props) {
  const [copiado, setCopiado] = useState(false);
  const enlace = `${window.location.origin}/sala/${codigo}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin portapapeles disponible: el usuario puede copiar el código a mano.
    }
  }

  return (
    <div className="codigo-invitacion">
      <p>
        Código de la sala: <strong className="codigo">{codigo}</strong>
      </p>
      <button type="button" onClick={copiar}>
        {copiado ? '¡Enlace copiado!' : 'Copiar enlace de invitación'}
      </button>
    </div>
  );
}
