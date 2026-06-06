interface Props {
  valor: number | null;
  puedeTirar: boolean;
  onTirar: () => void;
}

/** Muestra el último valor del dado y permite tirar si es mi turno. */
export function Dado({ valor, puedeTirar, onTirar }: Props) {
  return (
    <div className="dado">
      <div className="cara" role="img" aria-label={valor ? `Dado: ${valor}` : 'Dado sin tirar'}>
        {valor ?? '·'}
      </div>
      <button type="button" onClick={onTirar} disabled={!puedeTirar}>
        Tirar dado
      </button>
    </div>
  );
}
