/* eslint-disable no-console */

// Logger estructurado mínimo (sin dependencias): emite una línea JSON por evento.
// En Render basta con esto para tener logs legibles y filtrables.

type Nivel = 'info' | 'warn' | 'error';

function emitir(nivel: Nivel, msg: string, extra?: Record<string, unknown>): void {
  const linea = JSON.stringify({ t: new Date().toISOString(), nivel, msg, ...extra });
  if (nivel === 'error') console.error(linea);
  else console.log(linea);
}

export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => emitir('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emitir('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emitir('error', msg, extra),
};
