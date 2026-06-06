import { randomInt } from 'node:crypto';

// Sin caracteres ambiguos (I, O, 0, 1). 32 símbolos → 32^6 ≈ 1.07e9 combinaciones.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LONGITUD = 6;
const REGEX = new RegExp(`^[${ALFABETO}]{${LONGITUD}}$`);

/** Genera un código aleatorio criptográficamente seguro (no predecible). */
export function generarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < LONGITUD; i += 1) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

/** Normaliza la entrada del usuario (insensible a mayúsculas/espacios). */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function codigoValido(codigo: string): boolean {
  return typeof codigo === 'string' && REGEX.test(codigo);
}

/** Genera un código que no exista ya, reintentando ante colisión. */
export function generarCodigoUnico(existe: (codigo: string) => boolean, maxIntentos = 20): string {
  for (let i = 0; i < maxIntentos; i += 1) {
    const codigo = generarCodigo();
    if (!existe(codigo)) return codigo;
  }
  throw new Error('No se pudo generar un código de sala único');
}
