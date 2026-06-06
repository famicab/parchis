# Backlog ejecutable — MVP Parchís Online

> Convierte el roadmap en trabajo accionable. Tickets ordenados por **secuencia de ejecución real** (no por épica), con criterios de aceptación. Pensado para que un dev individual pueda empezar sin pensar "¿y ahora qué?".
>
> Documentos relacionados: [plan-desarrollo-parchis.md](plan-desarrollo-parchis.md) · [fase-2-motor-de-juego.md](fase-2-motor-de-juego.md)

---

## Cómo leer este backlog

- **Talla**: estimación relativa en puntos (1 = un rato, 2 = media sesión, 3 = una sesión, 5 = varias sesiones).
- **DoD**: cada ticket está "hecho" solo si cumple sus criterios de aceptación.
- **Orden**: ejecutar de arriba abajo. Las dependencias ya están resueltas en el orden.
- **Sprints**: agrupaciones lógicas, no plazos. Cada sprint termina en algo demostrable.

---

## Sprint 0 — Esqueleto vivo y desplegado *(Fase 0)*

Meta del sprint: **una web desplegada en la que dos pestañas se ven conectadas por WebSocket.** Aquí matamos pronto el riesgo de WebSockets en producción.

### PAR-001 · Inicializar monorepo · Talla 2
- Estructura `client/`, `server/`, `shared/` con workspaces.
- Git inicializado, `.gitignore`, README con cómo arrancar.
- **DoD:** `npm install` en raíz instala los tres paquetes; repo en remoto.

### PAR-002 · Tooling compartido (TS + lint + format) · Talla 2
- TypeScript, ESLint y Prettier configurados y compartidos.
- **DoD:** `npm run lint` y `npm run typecheck` pasan en los tres paquetes.

### PAR-003 · Paquete `shared`: contrato de tipos · Talla 3 ⭐
*El ticket más estratégico del sprint: la interfaz entre cliente y servidor.*
- Definir tipos del estado de partida (`EstadoPartida`, `Ficha`, `Color`, `Zona`).
- Definir el **catálogo de eventos** cliente→servidor y servidor→cliente (ver §Contrato más abajo).
- **DoD:** cliente y servidor importan los mismos tipos; cambiar un evento rompe la compilación en ambos lados (esto es deseable).

### PAR-004 · Servidor base con Socket.IO · Talla 2
- Servidor Node + Socket.IO levantando; endpoint de salud `/health`.
- Maneja `connection`/`disconnect` y un evento `ping → pong`.
- **DoD:** un cliente WS recibe `pong`.

### PAR-005 · Cliente base (Vite + React) conectado · Talla 2
- App React que se conecta al socket y muestra estado "conectado/desconectado".
- Variable de entorno para la URL del servidor.
- **DoD:** la UI refleja en tiempo real si el socket está vivo.

### PAR-006 · Script de arranque local conjunto · Talla 1
- Un comando levanta cliente + servidor a la vez.
- **DoD:** `npm run dev` desde la raíz arranca todo.

### PAR-007 · Despliegue del esqueleto (backend + frontend) · Talla 3 ⭐
- Backend en Render/Railway/Fly (con WebSocket habilitado), frontend en Vercel.
- CORS y `WSS` correctos entre ambos.
- **DoD:** la URL pública muestra "conectado" desde dos pestañas distintas. **No avanzar sin esto.**

---

## Sprint 1 — Salas y lobby *(Fase 1)*

Meta: **crear partida, compartir código, unirse y verse en el lobby en tiempo real.**

### PAR-101 · Modelo de Room en memoria · Talla 2
- Estructura `Room` (id, código, jugadores, estado del lobby/partida).
- Registro de salas en memoria (Map por código).
- **DoD:** tests unitarios de crear/buscar/eliminar sala.

### PAR-102 · Generación de código de invitación · Talla 1
- Código de 6 caracteres legibles (sin O/0, I/1), único.
- **DoD:** colisiones gestionadas; test de unicidad.

### PAR-103 · Crear partida · Talla 2
- Evento `crear_partida` → crea Room, asigna host y color, devuelve código.
- **DoD:** el creador recibe código y queda en el lobby como host.

### PAR-104 · Unirse a partida · Talla 3
- Evento `unirse_partida` con validaciones: código existe, aforo < 4, partida no empezada, nombre válido.
- Asignación automática de color libre.
- **DoD:** errores claros por cada caso inválido; jugador entra y aparece para todos.

### PAR-105 · Lobby en tiempo real · Talla 2
- Pantalla de lobby: lista de jugadores con su color, indicador de host.
- Broadcast al entrar/salir alguien.
- **DoD:** abrir 3 pestañas → las 3 ven la misma lista actualizándose.

### PAR-106 · Iniciar partida (solo host, mín. 2) · Talla 2
- Botón "Empezar" visible solo al host; exige ≥ 2 jugadores.
- Transición de Room de `LOBBY` a `EN_CURSO`.
- **DoD:** no se puede empezar con 1 jugador; al empezar, todos pasan a la pantalla de juego.

### PAR-107 · Pantalla de inicio (crear / unirse) · Talla 2
- Landing con dos caminos: crear partida o introducir código.
- **DoD:** flujo completo navegable de extremo a extremo.

---

## Sprint 2 — Motor de juego *(Fase 2)*

> Detalle completo en [fase-2-motor-de-juego.md](fase-2-motor-de-juego.md). Aquí solo el desglose en tickets. **Cada ticket lleva sus tests** (es la fase de mayor riesgo).

| Ticket | Descripción | Talla |
|---|---|---|
| PAR-201 | Constantes del tablero + proyección anillo↔pasillo | 3 ⭐ |
| PAR-202 | Estructura de estado + creación de partida | 2 |
| PAR-203 | Tirar dado (inyectado) + rotación básica de turno | 2 |
| PAR-204 | Movimiento simple en anillo (sin comer/barreras) | 3 |
| PAR-205 | Salir del garaje (regla del 5) | 2 |
| PAR-206 | Comer + bonificación +20 **manual** (jugada encadenada) + turno extra | 5 ⭐ |
| PAR-207 | Pasillo, cuenta exacta, meta + bonificación +10 **manual** | 3 |
| PAR-208 | Barreras / puentes | 3 ⭐ |
| PAR-209 | Turno extra completo + tres seises | 2 |
| PAR-210 | Condición de victoria | 1 |
| PAR-211 | Suite de partidas simuladas (regresión) | 3 |

**DoD del sprint:** todos los casos límite del §4 de [fase-2](fase-2-motor-de-juego.md) en verde + una partida completa simulada. El motor sin dependencias de red/UI.

> ✅ **Variantes de regla FIJADAS** (2026-06-06, ver §7 de fase-2): comer en salida = sí · 6 rompe barrera = sí · bonus +20/+10 = **manual** · tres seises = **última ficha movida**. El bonus manual eleva PAR-206 a talla 5 (sub-estado `bonusPendiente` + jugada encadenada) y obliga a que la UI del Sprint 3 permita elegir ficha para el bonus.

---

## Sprint 3 — Juego conectado (MVP funcional) *(Fase 3)*

Meta: **primera partida completable entre dispositivos.** Aquí se une motor + tiempo real + tablero.

| Ticket | Descripción | Talla |
|---|---|---|
| PAR-301 | Integrar motor en el servidor (estado por Room) | 2 |
| PAR-302 | Validación servidor: solo el jugador en turno actúa | 2 ⭐ |
| PAR-303 | Eventos `tirar`/`mover` + broadcast de estado | 3 |
| PAR-304 | Snapshot de estado al entrar/recargar | 2 |
| PAR-305 | Render del tablero (SVG) | 3 ⭐ |
| PAR-306 | Render de fichas en sus posiciones | 3 |
| PAR-307 | Dado interactivo + animación | 2 |
| PAR-308 | Resaltar jugadas legales + interacción de movimiento | 3 |
| PAR-309 | Indicador de turno y jugadores conectados | 1 |
| PAR-310 | Pantalla de victoria | 1 |

**DoD del sprint (= MVP funcional):** 2–4 personas en dispositivos distintos completan una partida entera. Puede ser feo, pero las reglas y la sincronización funcionan.

---

## Sprints posteriores (resumen)

- **Sprint 4 — Robustez (Fase 4):** desconexión, reconexión, timeout de turno, abandono, limpieza de salas. *No bloquea jugar, pero sí "jugar con amigos reales por wifi".*
- **Sprint 5 — Responsive y pulido (Fase 5):** layouts móvil/escritorio, áreas táctiles, paleta accesible, feedback de eventos.
- **Sprint 6 — Lanzamiento (Fase 6):** dominio, WSS, logs/monitorización, prueba real con 4 amigos = v1.0.

---

## Contrato de eventos (borrador para PAR-003) ⭐

Fijar esto pronto evita rehacer cliente y servidor. Nombres en español, *payloads* tipados en `shared`.

**Cliente → Servidor**

| Evento | Payload | Respuesta |
|---|---|---|
| `crear_partida` | `{ nombre }` | `{ codigo, jugadorId, color }` |
| `unirse_partida` | `{ codigo, nombre }` | `{ jugadorId, color }` \| `error` |
| `iniciar_partida` | `{}` | — (dispara `partida_iniciada`) |
| `tirar_dado` | `{}` | — (dispara `estado_actualizado`) |
| `mover_ficha` | `{ fichaId }` | — (dispara `estado_actualizado`) |
| `pasar_turno` | `{}` | — |

**Servidor → Cliente**

| Evento | Payload |
|---|---|
| `lobby_actualizado` | `{ jugadores[] }` |
| `partida_iniciada` | `EstadoPartida` |
| `estado_actualizado` | `{ estado, eventos[] }` |
| `turno_cambiado` | `{ turnoActual }` |
| `partida_terminada` | `{ ganador }` |
| `error` | `{ codigo, mensaje }` |

---

## Métricas para no perder el rumbo (uso del PM)

- **Camino crítico:** PAR-003 → Sprint 2 (motor) → Sprint 3. Si algo se atasca, que sea aquí y no en pulido.
- **Señal de alarma de scope creep:** si aparece un ticket que no es imprescindible para "4 amigos completan una partida", va al backlog de v2, no al MVP.
- **Hito de validación temprana:** al cerrar Sprint 3, invitar a 1–2 amigos a probar. El feedback real reordena el resto.
