interface Props {
  conectado: boolean;
}

/**
 * Componente presentacional puro: pinta el estado de conexión.
 * role="status" + aria-live para que los lectores de pantalla anuncien el cambio.
 */
export function IndicadorConexion({ conectado }: Props) {
  return (
    <p role="status" aria-live="polite">
      {conectado ? '🟢 Conectado' : '🔴 Desconectado'}
    </p>
  );
}
