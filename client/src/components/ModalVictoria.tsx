import type { Color } from '@parchis/shared';

interface Props {
  ganador: Color;
  miColor: Color | null;
  onSalir: () => void;
}

export function ModalVictoria({ ganador, miColor, onSalir }: Props) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-caja">
        <h2>{ganador === miColor ? '¡Has ganado! 🎉' : `Ganó ${ganador}`}</h2>
        <button type="button" onClick={onSalir}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
