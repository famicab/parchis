export { reducir, jugadasLegales, fichasMovibles, type Accion, type Resultado } from './motor';
export { elegirFichaAuto } from './autojuego';
export {
  avanceAPosicion,
  avanceDeFicha,
  esSeguro,
  SALIDA,
  CASILLAS_SEGURAS,
  CASILLAS_ANILLO,
  PASOS_PASILLO,
  AVANCE_META,
  ULTIMO_AVANCE_ANILLO,
  type Posicion,
} from './tablero';
export { crearEstadoInicial } from '../partida/estadoInicial';
