# Sprint 0 — Esqueleto vivo y desplegado · Guía de ejecución

> **Meta del sprint:** una web desplegada donde dos pestañas se ven "conectadas" por WebSocket.
> **Por qué primero:** matar pronto el riesgo de WebSockets en producción y dejar el monorepo listo.
> **Entorno:** Windows + PowerShell. Node 20 LTS recomendado.
>
> Tickets: PAR-001 → PAR-007. Ejecutar en orden. Cada uno con sus comandos y su criterio de "hecho".

---

## Estructura objetivo al terminar el sprint

```
parchis/
├─ package.json            # raíz: workspaces + scripts
├─ tsconfig.base.json      # config TS compartida
├─ .eslintrc.json
├─ .prettierrc
├─ .gitignore
├─ plans/                  # (ya existe)
├─ shared/                 # tipos y contrato compartidos
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ index.ts
│     ├─ tipos.ts          # EstadoPartida, Ficha, Color, Zona...
│     └─ eventos.ts        # contrato cliente↔servidor
├─ server/                 # Node + Socket.IO
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     └─ index.ts
└─ client/                 # Vite + React + TS
   ├─ package.json
   ├─ tsconfig.json
   └─ src/
      └─ ...
```

> Decisión: **npm workspaces** (sin pnpm/turbo) para mantenerlo simple en solitario.

---

## PAR-001 · Inicializar monorepo · Talla 2

**Prerrequisito:** comprobar versiones.
```powershell
node --version   # ≥ 20
npm --version
git --version
```

**1. Git + package.json raíz**
```powershell
git init
npm init -y
```

**2. Editar `package.json` raíz** → dejarlo como workspace:
```json
{
  "name": "parchis",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "npm run dev --workspace server",
    "dev:client": "npm run dev --workspace client",
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {}
}
```

**3. `.gitignore`**
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

**DoD:** repo inicializado, `package.json` con workspaces, `.gitignore` presente. (Aún no instala nada porque faltan los paquetes hijos.)

---

## PAR-002 · Tooling compartido (TS + lint + format) · Talla 2

**1. Dependencias de tooling en la raíz**
```powershell
npm install -D -W typescript eslint prettier concurrently `
  @typescript-eslint/parser @typescript-eslint/eslint-plugin `
  eslint-config-prettier
```
> `-W` instala en la raíz del workspace (evita el aviso de npm).

**2. `tsconfig.base.json`** (config que heredan los tres paquetes)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true
  }
}
```

**3. `.eslintrc.json`**
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "env": { "node": true, "browser": true, "es2022": true },
  "ignorePatterns": ["dist", "node_modules"]
}
```

**4. `.prettierrc`**
```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

**DoD:** `npm run lint` y `npm run typecheck` se ejecutan sin error de configuración (aunque aún no haya código real).

---

## PAR-003 · Paquete `shared`: contrato de tipos · Talla 3 ⭐

*El ticket más estratégico: la interfaz entre cliente y servidor.*

**1. Crear el paquete**
```powershell
New-Item -ItemType Directory shared\src
```

**2. `shared/package.json`**
```json
{
  "name": "@parchis/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```
> Para el MVP exportamos el `.ts` directamente (cliente/servidor lo transpilan). Sin paso de build, menos fricción.

**3. `shared/tsconfig.json`**
```json
{ "extends": "../tsconfig.base.json", "include": ["src"] }
```

**4. `shared/src/tipos.ts`** — modelo de estado (alineado con fase-2 §2)
```typescript
export type Color = 'rojo' | 'azul' | 'amarillo' | 'verde';
export type Zona = 'GARAJE' | 'ANILLO' | 'PASILLO' | 'META';

export interface Ficha {
  id: number;            // 0–3
  zona: Zona;
  casilla?: number;      // si ANILLO: 0–67
  paso?: number;         // si PASILLO: 1–7
}

export interface Jugador {
  id: string;
  nombre: string;
  color: Color;
  conectado: boolean;
  esHost: boolean;
}

export interface EstadoPartida {
  id: string;
  fase: 'EN_CURSO' | 'TERMINADA';
  colores: Color[];
  turnoActual: Color;
  dado: number | null;
  segundosSeises: number;
  tiradaExtra: boolean;
  ultimaFichaMovida: { color: Color; id: number } | null;
  bonusPendiente: { tipo: '+20' | '+10' } | null;
  fichas: Record<Color, Ficha[]>;
  ganador: Color | null;
}
```

**5. `shared/src/eventos.ts`** — contrato de socket (alineado con backlog §Contrato)
```typescript
import type { EstadoPartida, Jugador, Color } from './tipos.js';

// Cliente → Servidor
export interface EventosCliente {
  crear_partida: (p: { nombre: string }) => void;
  unirse_partida: (p: { codigo: string; nombre: string }) => void;
  iniciar_partida: () => void;
  tirar_dado: () => void;
  mover_ficha: (p: { fichaId: number }) => void;
  pasar_turno: () => void;
  ping: () => void;
}

// Servidor → Cliente
export interface EventosServidor {
  lobby_actualizado: (p: { jugadores: Jugador[] }) => void;
  partida_iniciada: (estado: EstadoPartida) => void;
  estado_actualizado: (p: { estado: EstadoPartida; eventos: string[] }) => void;
  partida_terminada: (p: { ganador: Color }) => void;
  error: (p: { codigo: string; mensaje: string }) => void;
  pong: () => void;
}
```

**6. `shared/src/index.ts`**
```typescript
export * from './tipos.js';
export * from './eventos.js';
```

**DoD:** cliente y servidor podrán importar `@parchis/shared`. Cambiar un evento aquí debe romper la compilación en ambos lados (señal de que el contrato está bien tipado).

---

## PAR-004 · Servidor base con Socket.IO · Talla 2

**1. Crear paquete e instalar**
```powershell
New-Item -ItemType Directory server\src
npm install -W express socket.io
npm install -D -W tsx @types/express
```

**2. `server/package.json`**
```json
{
  "name": "@parchis/server",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@parchis/shared": "*"
  }
}
```

**3. `server/tsconfig.json`**
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

**4. `server/src/index.ts`** (esqueleto con health + ping/pong, tipado con el contrato)
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { EventosCliente, EventosServidor } from '@parchis/shared';

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<EventosCliente, EventosServidor>(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? '*' },
});

io.on('connection', (socket) => {
  console.log('conectado', socket.id);
  socket.on('ping', () => socket.emit('pong'));
  socket.on('disconnect', () => console.log('desconectado', socket.id));
});

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () => console.log(`servidor en :${PORT}`));
```

**DoD:** `npm run dev:server` levanta el servidor; `GET http://localhost:3001/health` devuelve `{ ok: true }`.

---

## PAR-005 · Cliente base (Vite + React) conectado · Talla 2

**1. Andamiaje con Vite**
```powershell
npm create vite@latest client -- --template react-ts
npm install -W socket.io-client
```
> Tras crearlo, añadir a `client/package.json`: `"@parchis/shared": "*"` en dependencies, y `"typecheck": "tsc --noEmit"` en scripts.

**2. `client/.env.local`**
```
VITE_SERVER_URL=http://localhost:3001
```

**3. `client/src/socket.ts`**
```typescript
import { io, type Socket } from 'socket.io-client';
import type { EventosCliente, EventosServidor } from '@parchis/shared';

export const socket: Socket<EventosServidor, EventosCliente> = io(
  import.meta.env.VITE_SERVER_URL,
  { autoConnect: true },
);
```

**4. Sustituir `client/src/App.tsx`** por un indicador de conexión
```tsx
import { useEffect, useState } from 'react';
import { socket } from './socket';

export default function App() {
  const [conectado, setConectado] = useState(socket.connected);
  useEffect(() => {
    const on = () => setConectado(true);
    const off = () => setConectado(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    return () => { socket.off('connect', on); socket.off('disconnect', off); };
  }, []);
  return <h1>{conectado ? '🟢 Conectado' : '🔴 Desconectado'}</h1>;
}
```

**DoD:** `npm run dev:client` abre la app y muestra 🟢 cuando el servidor está vivo, 🔴 cuando se para.

---

## PAR-006 · Script de arranque local conjunto · Talla 1

Ya definido en el `package.json` raíz (PAR-001) con `concurrently`.

```powershell
npm install              # instala todo el workspace de una vez
npm run dev              # levanta server + client juntos
```

**DoD:** un solo `npm run dev` arranca ambos; la app muestra 🟢.

---

## PAR-007 · Despliegue del esqueleto · Talla 3 ⭐ — *NO AVANZAR SIN ESTO*

> Los WebSockets fallan en producción de formas que no ves en local (proxies, WSS, CORS). Por eso se despliega ya, con el esqueleto.

**Backend — Render (o Railway/Fly):**
1. Push del repo a GitHub.
2. Nuevo *Web Service* apuntando a `server/`.
   - Build: `npm install && npm run build --workspace server`
   - Start: `npm run start --workspace server`
   - Variable `CLIENT_ORIGIN` = URL del frontend (se rellena tras el paso siguiente).
3. Confirmar que la plataforma soporta WebSockets (Render y Railway sí, por defecto).

**Frontend — Vercel:**
1. Importar el repo, *Root Directory* = `client/`.
2. Variable `VITE_SERVER_URL` = URL pública del backend (con `https://`, Socket.IO negocia WSS solo).
3. Deploy.

**Cierre del círculo:**
- Poner `CLIENT_ORIGIN` del backend = dominio de Vercel y redeploy (CORS).

**DoD del ticket y del sprint:** abrir la URL pública en **dos pestañas/dispositivos** → ambas muestran 🟢. Parar el backend → muestran 🔴. **Hasta aquí no se empieza el Sprint 1.**

---

## Checklist final del Sprint 0

- [ ] `npm install` en raíz instala los 3 paquetes sin error.
- [ ] `npm run typecheck` y `npm run lint` pasan.
- [ ] `npm run dev` levanta cliente + servidor juntos.
- [ ] `/health` responde en local.
- [ ] El cliente muestra 🟢/🔴 según el estado del socket en local.
- [ ] Backend y frontend desplegados y comunicándose por WSS.
- [ ] Dos pestañas en la URL pública se ven conectadas.

> Cuando todo esté marcado: el riesgo de infraestructura está liquidado y se puede entrar al Sprint 1 (salas y lobby) con tranquilidad.
