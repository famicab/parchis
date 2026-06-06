import type { Color, EstadoPartida, Ficha } from '@parchis/shared';
import { AVANCE_META, SALIDA, avanceAPosicion, avanceDeFicha, esSeguro } from './tablero';

// Reglas fijadas (ver plans/fase-2-motor-de-juego.md §7):
// comer en salida = sí · 6 rompe barrera = sí (se fuerza al no permitir pasar
// si hay jugadas) · bonus +20/+10 = manual · tres seises = última ficha movida.

export type Accion =
  | { tipo: 'TIRAR_DADO'; color: Color; valor: number }
  | { tipo: 'MOVER_FICHA'; color: Color; fichaId: number }
  | { tipo: 'PASAR_TURNO'; color: Color };

export interface Resultado {
  estado: EstadoPartida;
  eventos: string[];
  error: string | null;
}

// --------------------------- consultas (puras) ---------------------------

function fichasDe(estado: EstadoPartida, color: Color): Ficha[] {
  return estado.fichas[color] ?? [];
}

function buscarFicha(estado: EstadoPartida, color: Color, id: number): Ficha | undefined {
  return fichasDe(estado, color).find((f) => f.id === id);
}

/** Una barrera son ≥2 fichas del mismo color en una casilla del anillo. */
function hayBarrera(estado: EstadoPartida, casilla: number): boolean {
  for (const color of estado.colores) {
    let n = 0;
    for (const f of fichasDe(estado, color)) {
      if (f.zona === 'ANILLO' && f.casilla === casilla) n += 1;
    }
    if (n >= 2) return true;
  }
  return false;
}

function esMovible(
  estado: EstadoPartida,
  color: Color,
  ficha: Ficha,
  valor: number,
  permitirSalir: boolean,
): boolean {
  if (ficha.zona === 'META') return false;

  if (ficha.zona === 'GARAJE') {
    if (!permitirSalir || valor !== 5) return false;
    return !hayBarrera(estado, SALIDA[color]); // una barrera en la salida impide salir
  }

  const avanceDestino = avanceDeFicha(color, ficha) + valor;
  if (avanceDestino > AVANCE_META) return false; // cuenta exacta hasta meta

  // El recorrido (incluido el destino) no puede cruzar/aterrizar en una barrera.
  for (let a = avanceDeFicha(color, ficha) + 1; a <= avanceDestino; a += 1) {
    const pos = avanceAPosicion(color, a);
    if (pos && pos.zona === 'ANILLO' && hayBarrera(estado, pos.casilla)) return false;
  }
  return true;
}

export function fichasMovibles(
  estado: EstadoPartida,
  color: Color,
  valor: number,
  permitirSalir: boolean,
): number[] {
  return fichasDe(estado, color)
    .filter((f) => esMovible(estado, color, f, valor, permitirSalir))
    .map((f) => f.id);
}

/** Fichas que el jugador en turno puede mover ahora mismo (según dado o bonus). */
export function jugadasLegales(estado: EstadoPartida): number[] {
  if (estado.fase !== 'EN_CURSO') return [];
  const color = estado.turnoActual;
  if (estado.bonusPendiente) {
    return fichasMovibles(estado, color, estado.bonusPendiente.tipo === '+20' ? 20 : 10, false);
  }
  if (estado.dado !== null) return fichasMovibles(estado, color, estado.dado, true);
  return [];
}

// --------------------------- mutadores (sobre el clon) ---------------------------

function intentarCaptura(
  estado: EstadoPartida,
  color: Color,
  casilla: number,
  saliendoDeGaraje: boolean,
): boolean {
  const rivales: Ficha[] = [];
  for (const c of estado.colores) {
    if (c === color) continue;
    for (const f of fichasDe(estado, c)) {
      if (f.zona === 'ANILLO' && f.casilla === casilla) rivales.push(f);
    }
  }
  if (rivales.length !== 1) return false; // 0 = nada; ≥2 = barrera (no se aterriza encima)

  // En un seguro no se come, salvo la excepción de salir del garaje a la propia salida.
  const puede = !esSeguro(casilla) || (saliendoDeGaraje && casilla === SALIDA[color]);
  if (!puede) return false;

  const rival = rivales[0];
  rival.zona = 'GARAJE';
  delete rival.casilla;
  delete rival.paso;
  return true;
}

function aplicarAvance(
  estado: EstadoPartida,
  color: Color,
  fichaId: number,
  valor: number,
): { capturo: boolean; llegoMeta: boolean } {
  const ficha = buscarFicha(estado, color, fichaId)!;
  let destinoCasilla: number | null = null;
  let saliendoDeGaraje = false;

  if (ficha.zona === 'GARAJE') {
    saliendoDeGaraje = true;
    ficha.zona = 'ANILLO';
    ficha.casilla = SALIDA[color];
    delete ficha.paso;
    destinoCasilla = ficha.casilla;
  } else {
    const pos = avanceAPosicion(color, avanceDeFicha(color, ficha) + valor)!;
    if (pos.zona === 'ANILLO') {
      ficha.zona = 'ANILLO';
      ficha.casilla = pos.casilla;
      delete ficha.paso;
      destinoCasilla = pos.casilla;
    } else if (pos.zona === 'PASILLO') {
      ficha.zona = 'PASILLO';
      ficha.paso = pos.paso;
      delete ficha.casilla;
    } else {
      ficha.zona = 'META';
      delete ficha.casilla;
      delete ficha.paso;
    }
  }

  const llegoMeta = ficha.zona === 'META';
  const capturo = destinoCasilla !== null && intentarCaptura(estado, color, destinoCasilla, saliendoDeGaraje);
  return { capturo, llegoMeta };
}

function todasEnMeta(estado: EstadoPartida, color: Color): boolean {
  const fichas = fichasDe(estado, color);
  return fichas.length > 0 && fichas.every((f) => f.zona === 'META');
}

function avanzarTurno(estado: EstadoPartida, eventos: string[]): void {
  const idx = estado.colores.indexOf(estado.turnoActual);
  estado.turnoActual = estado.colores[(idx + 1) % estado.colores.length];
  estado.dado = null;
  estado.segundosSeises = 0;
  estado.tiradaExtra = false;
  estado.ultimaFichaMovida = null;
  estado.bonusPendiente = null;
  eventos.push('TURNO');
}

// --------------------------- reductor ---------------------------

const ok = (estado: EstadoPartida, eventos: string[]): Resultado => ({ estado, eventos, error: null });
const fallo = (entrada: EstadoPartida, error: string): Resultado => ({ estado: entrada, eventos: [], error });

export function reducir(entrada: EstadoPartida, accion: Accion): Resultado {
  if (entrada.fase === 'TERMINADA') return fallo(entrada, 'La partida ha terminado.');
  if (accion.color !== entrada.turnoActual) return fallo(entrada, 'No es tu turno.');

  const estado: EstadoPartida = structuredClone(entrada);
  const eventos: string[] = [];

  switch (accion.tipo) {
    case 'TIRAR_DADO':
      return tirarDado(entrada, estado, accion.valor, eventos);
    case 'MOVER_FICHA':
      return moverFicha(entrada, estado, accion.fichaId, eventos);
    case 'PASAR_TURNO':
      return pasarTurno(entrada, estado, eventos);
    default:
      return fallo(entrada, 'Acción desconocida.');
  }
}

function tirarDado(entrada: EstadoPartida, estado: EstadoPartida, valor: number, eventos: string[]): Resultado {
  if (estado.bonusPendiente) return fallo(entrada, 'Resuelve la bonificación pendiente.');
  if (estado.dado !== null) return fallo(entrada, 'Ya has tirado el dado.');
  if (!Number.isInteger(valor) || valor < 1 || valor > 6) return fallo(entrada, 'Valor de dado inválido.');

  if (valor === 6) {
    if (estado.segundosSeises === 2) {
      // Tercer 6 seguido: castiga a la última ficha movida (salvo si está en meta).
      eventos.push('TRES_SEISES');
      const ultima = estado.ultimaFichaMovida;
      if (ultima) {
        const f = buscarFicha(estado, ultima.color, ultima.id);
        if (f && f.zona !== 'META') {
          f.zona = 'GARAJE';
          delete f.casilla;
          delete f.paso;
        }
      }
      avanzarTurno(estado, eventos);
      return ok(estado, eventos);
    }
    estado.segundosSeises += 1;
  } else {
    estado.segundosSeises = 0;
  }

  estado.dado = valor;
  eventos.push('DADO');
  return ok(estado, eventos);
}

function moverFicha(entrada: EstadoPartida, estado: EstadoPartida, fichaId: number, eventos: string[]): Resultado {
  const color = estado.turnoActual;

  // Modo bonificación: el jugador elige qué ficha avanza el +20/+10.
  if (estado.bonusPendiente) {
    const valor = estado.bonusPendiente.tipo === '+20' ? 20 : 10;
    if (!fichasMovibles(estado, color, valor, false).includes(fichaId)) {
      return fallo(entrada, 'Movimiento de bonificación no válido.');
    }
    estado.bonusPendiente = null;
    const r = aplicarAvance(estado, color, fichaId, valor);
    estado.ultimaFichaMovida = { color, id: fichaId };
    registrarMovimiento(eventos, r);
    return cerrarMovimiento(estado, eventos, true, r);
  }

  // Movimiento normal con el dado pendiente.
  if (estado.dado === null) return fallo(entrada, 'Tira el dado primero.');
  const valor = estado.dado;
  if (!fichasMovibles(estado, color, valor, true).includes(fichaId)) {
    return fallo(entrada, 'Ese movimiento no es legal.');
  }

  const eraSeis = valor === 6;
  estado.dado = null;
  const r = aplicarAvance(estado, color, fichaId, valor);
  estado.ultimaFichaMovida = { color, id: fichaId };
  registrarMovimiento(eventos, r);
  return cerrarMovimiento(estado, eventos, eraSeis, r);
}

function registrarMovimiento(eventos: string[], r: { capturo: boolean; llegoMeta: boolean }): void {
  eventos.push('MUEVE');
  if (r.capturo) eventos.push('COME');
  if (r.llegoMeta) eventos.push('META');
}

/** Resuelve victoria, bonificaciones encadenadas y continuación/cambio de turno. */
function cerrarMovimiento(
  estado: EstadoPartida,
  eventos: string[],
  turnoExtraBase: boolean,
  r: { capturo: boolean; llegoMeta: boolean },
): Resultado {
  const color = estado.turnoActual;

  if (todasEnMeta(estado, color)) {
    estado.fase = 'TERMINADA';
    estado.ganador = color;
    estado.dado = null;
    estado.bonusPendiente = null;
    eventos.push('VICTORIA');
    return ok(estado, eventos);
  }

  const tipoBonus = r.capturo ? '+20' : r.llegoMeta ? '+10' : null;
  if (tipoBonus) {
    const valor = tipoBonus === '+20' ? 20 : 10;
    if (fichasMovibles(estado, color, valor, false).length > 0) {
      estado.bonusPendiente = { tipo: tipoBonus };
      estado.tiradaExtra = true;
      eventos.push('BONUS_PENDIENTE');
      return ok(estado, eventos);
    }
    // Sin ficha legal para la bonificación: se descarta, pero conserva el turno.
  }

  const turnoExtra = turnoExtraBase || r.capturo || r.llegoMeta;
  if (turnoExtra) {
    estado.tiradaExtra = true;
    eventos.push('TURNO_EXTRA');
    return ok(estado, eventos);
  }

  avanzarTurno(estado, eventos);
  return ok(estado, eventos);
}

function pasarTurno(entrada: EstadoPartida, estado: EstadoPartida, eventos: string[]): Resultado {
  if (estado.bonusPendiente) return fallo(entrada, 'Resuelve la bonificación pendiente.');
  if (estado.dado === null) return fallo(entrada, 'Tira el dado antes de pasar.');
  if (jugadasLegales(estado).length > 0) return fallo(entrada, 'Tienes jugadas legales; debes mover.');
  avanzarTurno(estado, eventos);
  return ok(estado, eventos);
}
