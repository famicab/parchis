interface Props {
  visible: boolean;
  habilitado: boolean;
  onEmpezar: () => void;
}

/** Botón de inicio: visible solo para el host, habilitado con jugadores suficientes. */
export function BotonEmpezar({ visible, habilitado, onEmpezar }: Props) {
  if (!visible) return null;
  return (
    <button type="button" className="empezar" disabled={!habilitado} onClick={onEmpezar}>
      Empezar partida
    </button>
  );
}
