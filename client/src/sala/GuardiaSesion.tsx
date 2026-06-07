import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useSala } from './SalaContext';

const CLAVE_SESION = 'parchis:sala';

/**
 * Reconexión automática: al cargar (o al reconectar el transporte tras una caída),
 * si hay una sesión guardada, re-vincula el socket y navega al lobby o al tablero.
 * No pinta nada. El servidor envía el snapshot; aquí solo restauramos identidad y ruta.
 */
export function GuardiaSesion() {
  const { reconectarSesion } = useSala();
  const navigate = useNavigate();

  useEffect(() => {
    const guardado = sessionStorage.getItem(CLAVE_SESION);
    if (!guardado) return;

    let primera = true;
    const intentar = () => {
      const navegar = primera;
      primera = false;
      let datos: { codigo?: string; jugadorId?: string };
      try {
        datos = JSON.parse(guardado);
      } catch {
        sessionStorage.removeItem(CLAVE_SESION);
        return;
      }
      if (!datos.codigo || !datos.jugadorId) return;

      reconectarSesion(datos.codigo, datos.jugadorId).then((r) => {
        if (!r.ok) {
          sessionStorage.removeItem(CLAVE_SESION); // la sala ya no existe (p. ej. servidor reiniciado)
          return;
        }
        if (navegar) navigate(r.fase === 'EN_CURSO' ? '/partida' : '/lobby');
      });
    };

    socket.on('connect', intentar);
    if (socket.connected) intentar();
    return () => {
      socket.off('connect', intentar);
    };
  }, [reconectarSesion, navigate]);

  return null;
}
