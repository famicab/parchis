import { describe, expect, it } from 'vitest';
import { codigoValido, generarCodigo, generarCodigoUnico, normalizarCodigo } from './codigo';

describe('código de invitación', () => {
  it('genera códigos de 6 caracteres del alfabeto permitido', () => {
    for (let i = 0; i < 200; i += 1) {
      const c = generarCodigo();
      expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('no usa caracteres ambiguos (I, O, 0, 1)', () => {
    const muestra = Array.from({ length: 500 }, () => generarCodigo()).join('');
    expect(muestra).not.toMatch(/[IO01]/);
  });

  it('valida el formato correctamente', () => {
    expect(codigoValido('ABCDEF')).toBe(true);
    expect(codigoValido('ABCDE')).toBe(false); // corto
    expect(codigoValido('ABCDE1')).toBe(false); // contiene 1
    expect(codigoValido('abcdef')).toBe(false); // minúsculas
  });

  it('normaliza entrada del usuario (trim + mayúsculas)', () => {
    expect(normalizarCodigo('  abcdef  ')).toBe('ABCDEF');
  });

  it('reintenta ante colisión hasta encontrar uno libre', () => {
    const ocupados = new Set<string>();
    let llamadas = 0;
    // Las dos primeras "existen" para forzar reintentos.
    const existe = (c: string) => {
      llamadas += 1;
      if (llamadas <= 2) {
        ocupados.add(c);
        return true;
      }
      return ocupados.has(c);
    };
    const codigo = generarCodigoUnico(existe);
    expect(codigoValido(codigo)).toBe(true);
    expect(ocupados.has(codigo)).toBe(false);
  });

  it('genera códigos únicos en volumen', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 1000; i += 1) vistos.add(generarCodigo());
    // Con 32^6 combinaciones, 1000 generaciones casi nunca colisionan.
    expect(vistos.size).toBeGreaterThan(995);
  });
});
