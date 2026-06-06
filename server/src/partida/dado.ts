import { randomInt } from 'node:crypto';

/**
 * Lanza el dado (1–6) con aleatoriedad criptográfica. Vive FUERA del motor:
 * el motor recibe el valor ya tirado, lo que mantiene las reglas deterministas
 * y testeables. El servidor es quien decide el valor (cliente nunca).
 */
export function lanzarDado(): number {
  return randomInt(1, 7);
}
