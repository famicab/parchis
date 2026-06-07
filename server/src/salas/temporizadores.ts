import type { EstadoPartida } from '@parchis/shared';
import { jugadasLegales } from '../motor';
import type { RegistroSalas, ResultadoAccion } from './registro';

export interface OpcionesTemporizadores {
  msTirar?: number; // ventana para tirar el dado
  msMover?: number; // ventana para mover ficha
  msPasar?: number; // pausa breve cuando no hay jugadas (auto-pasar)
}

const POR_DEFECTO: Required<OpcionesTemporizadores> = {
  msTirar: 15000,
  msMover: 30000,
  msPasar: 1500,
};

/**
 * Temporizadores de turno por sala (anti-AFK), autoritativos en el servidor.
 * Se re-programan tras cada cambio de estado; al agotarse, ejecutan la auto-jugada
 * por el mismo `reducir` (el cliente solo muestra la cuenta atrás).
 */
export class GestorTemporizadores {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly ms: Required<OpcionesTemporizadores>;

  constructor(
    private readonly registro: RegistroSalas,
    private readonly alAutoJugar: (resultado: ResultadoAccion) => void,
    opciones: OpcionesTemporizadores = {},
  ) {
    this.ms = { ...POR_DEFECTO, ...opciones };
  }

  /** (Re)programa el temporizador de una sala según lo que falte por hacer. */
  reprogramar(codigo: string): void {
    this.cancelar(codigo);
    const sala = this.registro.salaPorCodigo(codigo);
    if (!sala || !sala.partida || sala.partida.fase !== 'EN_CURSO') return;

    const handle = setTimeout(() => this.disparar(codigo), this.duracion(sala.partida));
    handle.unref?.();
    this.timers.set(codigo, handle);
  }

  cancelar(codigo: string): void {
    const handle = this.timers.get(codigo);
    if (handle) {
      clearTimeout(handle);
      this.timers.delete(codigo);
    }
  }

  detenerTodo(): void {
    for (const handle of this.timers.values()) clearTimeout(handle);
    this.timers.clear();
  }

  private disparar(codigo: string): void {
    this.timers.delete(codigo);
    const resultado = this.registro.autoJugar(codigo);
    if (resultado && resultado.ok) this.alAutoJugar(resultado);
    this.reprogramar(codigo); // re-arma para la siguiente acción (o no, si terminó)
  }

  private duracion(estado: EstadoPartida): number {
    if (estado.dado === null && estado.bonusPendiente === null) return this.ms.msTirar;
    if (jugadasLegales(estado).length === 0) return this.ms.msPasar;
    return this.ms.msMover;
  }
}
