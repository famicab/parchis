# Parchís Online

Juego de **Parchís** multijugador en tiempo real para jugar con amigos desde el navegador. Partidas privadas mediante código de invitación, de 2 a 4 jugadores, compatible con móvil y escritorio.

> Estado: **Sprint 0 completado** — esqueleto cliente/servidor conectado por WebSocket. En desarrollo activo.

## Características (objetivo del MVP)

- 🎲 Partidas en tiempo real (WebSocket).
- 👥 2–4 jugadores.
- 🔒 Salas privadas con código de invitación.
- 📱 Responsive (móvil y escritorio).
- 🛡️ **Servidor autoritativo**: el cliente solo dibuja; las reglas, el dado y el estado los decide el servidor.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + TypeScript + Socket.IO |
| Tiempo real | WebSocket (Socket.IO) |
| Tests | Vitest + Testing Library |
| Monorepo | npm workspaces |

## Estructura del proyecto

```
parchis/
├─ shared/   # Contrato compartido: tipos del estado y eventos de socket
├─ server/   # Backend autoritativo (Socket.IO)
└─ client/   # Aplicación React
```

`shared/` es la frontera tipada entre cliente y servidor: cambiar un evento allí
rompe la compilación en ambos lados a la vez (deseable).

## Requisitos

- Node.js 20.x (recomendado 20.18.1, fijado en `.node-version`)
- npm 10+

## Puesta en marcha

```bash
# 1. Instalar dependencias de todo el workspace
npm install

# 2. Arrancar cliente + servidor a la vez
npm run dev
```

- Cliente: http://localhost:5173
- Servidor: http://localhost:3001 (health check en `/health`)

### Variables de entorno

Copia los ejemplos y ajústalos si lo necesitas (en local funcionan los valores por defecto):

```bash
cp client/.env.example client/.env.local   # VITE_SERVER_URL
cp server/.env.example server/.env          # PORT, CLIENT_ORIGIN
```

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Cliente + servidor en desarrollo |
| `npm run dev:server` | Solo el servidor |
| `npm run dev:client` | Solo el cliente |
| `npm run build` | Build de producción de cada workspace |
| `npm run typecheck` | Comprobación de tipos en todo el monorepo |
| `npm run test` | Tests (server + client) |
| `npm run lint` | ESLint |

## Tests

```bash
npm run test
```

El servidor incluye tests de integración (Socket.IO) y el cliente tests de
componente (jsdom + Testing Library).

## Despliegue

- **Backend** → Render (Blueprint en `render.yaml`).
- **Frontend** → Vercel (configuración en `vercel.json`).

El servidor lee `PORT` del entorno y restringe CORS con `CLIENT_ORIGIN`. El
cliente recibe la URL del backend en build mediante `VITE_SERVER_URL`.

## Licencia

Proyecto personal. Todos los derechos reservados.
