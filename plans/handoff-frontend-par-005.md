# Handoff Backend → Frontend · PAR-005 (Cliente Vite + React)

> Documento de traspaso. El backend del Sprint 0 ya está hecho y probado; aquí está todo lo que el **Frontend Engineer** necesita para enganchar el cliente al contrato ya tipado.
>
> Relacionados: [sprint-0-setup.md](sprint-0-setup.md) · [backlog-mvp.md](backlog-mvp.md) · contrato en `shared/src/`.

---

## 1. Qué te da ya hecho el backend

- **Servidor en local:** `http://localhost:3001`, arrancable con `npm run dev:server`.
- **CORS abierto:** `origin: CLIENT_ORIGIN ?? '*'` → Vite en `:5173` conecta sin configurar nada.
- **Canal de prueba:** emites `ping` y recibes `pong`. Suficiente para el indicador 🟢/🔴 del DoD sin esperar al lobby.
- **Contrato tipado:** `shared/src/eventos.ts` (`EventosCliente`, `EventosServidor`) y `shared/src/tipos.ts` (`EstadoPartida`, `Ficha`, `Color`, `Jugador`, ...).

---

## 2. Pasos de enganche (PAR-005)

1. **Andamiar el cliente:**
   ```powershell
   npm create vite@latest client -- --template react-ts
   ```
2. **Registrar el workspace:** añadir `"client"` al array `workspaces` de la raíz `package.json` (ahora es `["shared","server"]`). En cuanto exista, `npm run dev` combinado funcionará.
3. **`client/package.json`** — añadir:
   - dependencias: `"@parchis/shared": "*"`, `"socket.io-client": "^4.8.0"`
   - script: `"typecheck": "tsc --noEmit"`
4. **`client/.env.local`:**
   ```
   VITE_SERVER_URL=http://localhost:3001
   ```
5. **`client/src/socket.ts`** — el genérico va **en este orden** (socket.io-client es `Socket<EventosQueEscucha, EventosQueEmite>`):
   ```ts
   import { io, type Socket } from 'socket.io-client';
   import type { EventosCliente, EventosServidor } from '@parchis/shared';

   export const socket: Socket<EventosServidor, EventosCliente> = io(
     import.meta.env.VITE_SERVER_URL,
     { autoConnect: true },
   );
   ```
   > Invertido respecto al servidor, que es `Server<EventosCliente, EventosServidor>`. El cliente **escucha** lo del servidor y **emite** lo del cliente.
6. **DoD del ticket:** `App.tsx` con indicador 🟢/🔴 escuchando `connect`/`disconnect` (ver `sprint-0-setup.md` §PAR-005 para el snippet completo).

---

## 3. Puntos NO obvios (leer antes de empezar)

- ⚠️ **Importa solo `import type` desde `@parchis/shared`.** El paquete `shared` exporta su `.ts` directo (sin build). Mientras solo consumas **tipos**, se borran en compilación y Vite nunca tiene que transpilar código de `node_modules` → cero fricción. El día que `shared` exporte **valores en runtime** (p. ej. constantes del tablero del motor), habrá que añadir en `vite.config.ts`:
  ```ts
  optimizeDeps: { exclude: ['@parchis/shared'] }
  ```
  y asegurar que Vite transpile el paquete enlazado. Por ahora **no lo necesitas**.

- **Frontera autoritativa (regla del proyecto):** el cliente **nunca** calcula jugadas legales, el dado ni el estado. Solo:
  1. **renderiza** el `EstadoPartida` que llega por `estado_actualizado` / `partida_iniciada`, y
  2. **emite intención** (`tirar_dado`, `mover_ficha: { fichaId }`).

  El resaltado de jugadas legales (PAR-308) lo decide el servidor; el cliente lo pinta.

- **Reconexión:** socket.io reconecta solo. Cuando montemos lobby/partida (Sprint 1/3), el servidor reemitirá un **snapshot** al reconectar (PAR-304); el cliente no debe guardar estado de juego como fuente de verdad, solo cachearlo para pintar.

- **El `dev` combinado fallará** hasta que `client` esté en `workspaces`. Mientras tanto: `npm run dev:server` y `npm run dev --workspace client` por separado.

---

## 4. Contrato disponible (referencia rápida)

**Emite** (cliente → servidor):
`crear_partida` · `unirse_partida` · `iniciar_partida` · `tirar_dado` · `mover_ficha` · `pasar_turno` · `ping`

**Escucha** (servidor → cliente):
`lobby_actualizado` · `partida_iniciada` · `estado_actualizado` · `partida_terminada` · `error` · `pong`

> Para **PAR-005** basta con `ping`/`pong` + `connect`/`disconnect`. El resto se activan en Sprint 1 (lobby) y Sprint 3 (juego), pero ya están tipados: el frontend puede maquetar contra ellos desde ya.

---

## 5. Definition of Done de PAR-005

- [ ] `client` añadido a `workspaces` y `npm install` enlaza `@parchis/shared`.
- [ ] `client/.env.local` con `VITE_SERVER_URL`.
- [ ] `socket.ts` tipado con el contrato compartido.
- [ ] La app muestra 🟢 cuando el servidor está vivo y 🔴 cuando se para.
- [ ] `npm run dev` (combinado) levanta server + client juntos.
- [ ] `npm run typecheck` pasa también en `client`.
