import { useEffect, useState } from 'react';
import { socket } from '../socket';

/**
 * Encapsula el estado de conexión del socket. La UI solo consume el booleano;
 * no contiene lógica de juego (regla del rol: el estado lo dirige el servidor).
 */
export function useConexion(): boolean {
  const [conectado, setConectado] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConectado(true);
    const onDisconnect = () => setConectado(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return conectado;
}
