import { defineWorkspace } from 'vitest/config';

// El servidor corre en entorno node; el cliente usa su propio vite.config.ts
// (plugin-react + jsdom). Así un único `npm test` cubre ambos paquetes.
export default defineWorkspace(['server', 'client']);
