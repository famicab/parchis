# Plan de Desarrollo — Parchís Online

> Documento de producto. Aplicación web de Parchís en tiempo real para jugar con amigos (2–4 jugadores, partidas privadas por código de invitación, móvil y escritorio).
>
> Pensado para **un solo desarrollador**, priorizando entregar algo jugable cuanto antes y evitar el *scope creep*.

---

## 0. Decisiones de arquitectura previas

| Área | Recomendación | Por qué |
|---|---|---|
| **Frontend** | React + Vite + TypeScript | Ecosistema enorme, rápido de iterar |
| **Tiempo real** | WebSocket vía **Socket.IO** | Reconexión y *rooms* ya resueltas |
| **Backend** | Node.js + TypeScript (mismo lenguaje) | Un solo lenguaje = menos carga mental |
| **Estado de partida** | **Autoritativo en el servidor** | Evita trampas; el cliente solo dibuja |
| **Persistencia** | En memoria al inicio → Redis/SQLite después | No optimices antes de tiempo |
| **Render tablero** | SVG o Canvas | SVG es más fácil para clics y responsive |
| **Hosting** | Render / Railway / Fly.io (backend) + Vercel (front) | Tier gratuito, despliegue simple |

> **Regla de oro del proyecto:** el servidor es la única fuente de verdad. El cliente nunca decide si un movimiento es legal.

---

## 1. Definición del MVP

**Visión:** jugar una partida completa de Parchís en tiempo real con amigos, mediante un código de invitación, desde móvil o escritorio.

### Dentro del MVP
- Crear partida privada → genera **código de invitación**.
- Unirse con código (2–4 jugadores).
- Sala de espera (lobby) con lista de jugadores y botón "Empezar".
- Tablero de Parchís funcional y responsive.
- Tirar el dado (servidor genera el valor).
- Reglas **completas del núcleo**:
  - Sacar ficha de casa con un 5.
  - Mover según el dado.
  - Comer ficha rival (y bonus de +20).
  - Llegar a meta (y bonus de +10).
  - Tres 6 → la ficha más adelantada vuelve a casa.
  - Turno extra al sacar 6 o al comer/llegar a meta.
  - Barreras/puentes (dos fichas mismo color bloquean).
- Detección de **victoria** (4 fichas en meta).
- Sincronización en tiempo real entre todos los jugadores.
- Indicación visual de "de quién es el turno".
- Reconexión básica si se cae la conexión.

### Fuera del MVP (v2 y más allá)
- Cuentas de usuario / login.
- Ranking, estadísticas, perfiles.
- Chat de texto o voz.
- Bots / jugar contra la IA.
- Partidas públicas / matchmaking.
- Modos de juego alternativos, fichas/temas personalizables.
- Emparejamiento de equipos (2v2).
- App nativa.

> **Criterio de éxito del MVP:** 4 amigos en 4 dispositivos distintos completan una partida entera sin que el dev tenga que intervenir.

---

## 2. Épicas

| ID | Épica | Objetivo |
|---|---|---|
| **E1** | Fundaciones del proyecto | Repo, stack, CI/CD, esqueleto cliente-servidor |
| **E2** | Gestión de salas y lobby | Crear/unirse a partidas con código |
| **E3** | Motor de juego (reglas) | Lógica de Parchís autoritativa en servidor |
| **E4** | Capa de tiempo real | Sincronización de estado vía WebSocket |
| **E5** | Interfaz de juego (tablero) | Render del tablero, fichas, dado, turnos |
| **E6** | Robustez y ciclo de vida | Reconexión, abandono, fin de partida |
| **E7** | Responsive y UX | Móvil/escritorio, pulido visual, feedback |
| **E8** | Despliegue y operación | Hosting, dominio, monitorización básica |

---

## 3. Épicas → Tareas

### E1 — Fundaciones
- T1.1 Inicializar monorepo (carpetas `client/` y `server/`) + Git.
- T1.2 Configurar TypeScript, ESLint, Prettier compartidos.
- T1.3 Esqueleto del servidor (Node + Socket.IO levantando).
- T1.4 Esqueleto del cliente (Vite + React, conexión WS de prueba "ping/pong").
- T1.5 Definir **tipos compartidos** (estado de partida, eventos) en un paquete común.
- T1.6 Script de arranque local (cliente + servidor a la vez).

### E2 — Salas y lobby
- T2.1 Modelo de "Room" en memoria (id, código, jugadores, estado).
- T2.2 Generación de código de invitación único (6 caracteres legibles).
- T2.3 Evento `crear_partida` → devuelve código.
- T2.4 Evento `unirse_partida` (validar código, aforo 2–4, nombre/color).
- T2.5 Asignación de color por jugador (rojo/azul/amarillo/verde).
- T2.6 Pantalla de lobby (lista de jugadores en tiempo real).
- T2.7 Solo el host puede iniciar; validar mínimo 2 jugadores.
- T2.8 Manejo de errores (código inválido, sala llena, partida ya empezada).

### E3 — Motor de juego (el corazón, lo más complejo)
- T3.1 Modelar el tablero (casillas, recorrido por color, casa, pasillo, meta, casillas seguras).
- T3.2 Estructura de estado de partida (posición de las 16 fichas, turno, dado, contadores).
- T3.3 Tirada de dado (servidor, aleatoriedad).
- T3.4 Cálculo de **movimientos legales** dado un valor de dado.
- T3.5 Aplicar movimiento + comer ficha (+20).
- T3.6 Regla del 5 para salir de casa.
- T3.7 Llegada a meta (+10) y entrada exacta.
- T3.8 Barreras / puentes (bloqueo de paso).
- T3.9 Turno extra (6, comer, meta) y rotación de turno.
- T3.10 Regla de los tres 6.
- T3.11 Condición de victoria.
- T3.12 **Tests unitarios** de cada regla (crítico: aquí se concentran los bugs).

### E4 — Tiempo real
- T4.1 Diseñar el contrato de eventos cliente↔servidor (tirar, mover, estado_actualizado, turno_cambiado, fin_partida).
- T4.2 Broadcast del estado a todos los de la sala tras cada acción.
- T4.3 Validación servidor: solo el jugador en turno puede actuar.
- T4.4 Anti-trampa: el servidor recibe "intención" (qué ficha mover), no posiciones.
- T4.5 Snapshot de estado para clientes que entran/recargan.

### E5 — Interfaz del juego
- T5.1 Render del tablero (SVG, responsive).
- T5.2 Render de fichas en sus posiciones.
- T5.3 Componente de dado (animación de tirada).
- T5.4 Resaltar fichas movibles / casillas destino.
- T5.5 Interacción: clic en dado → clic en ficha a mover.
- T5.6 Indicador de turno y de jugadores conectados.
- T5.7 Animación de movimiento de ficha.
- T5.8 Feedback de eventos (comiste, llegaste a meta, tres 6).
- T5.9 Pantalla de victoria.

### E6 — Robustez y ciclo de vida
- T6.1 Detección de desconexión de un jugador.
- T6.2 Reconexión: reasignar al jugador a su sala y color.
- T6.3 Manejo de turno cuando un jugador está caído (timeout / saltar turno).
- T6.4 Abandono explícito de partida.
- T6.5 Limpieza de salas vacías o terminadas.
- T6.6 Estado "pausado" si faltan jugadores.

### E7 — Responsive y UX
- T7.1 Layout móvil (tablero + controles sin scroll incómodo).
- T7.2 Layout escritorio.
- T7.3 Áreas táctiles adecuadas (dedos vs ratón).
- T7.4 Pantalla de inicio (crear / unirse).
- T7.5 Estados de carga y errores amigables.
- T7.6 Pulido visual y paleta de colores accesible.

### E8 — Despliegue
- T8.1 Desplegar backend (con soporte WebSocket).
- T8.2 Desplegar frontend.
- T8.3 Variables de entorno y CORS.
- T8.4 Dominio + HTTPS/WSS.
- T8.5 Logs y monitorización mínima.
- T8.6 Prueba real con amigos en dispositivos distintos.

---

## 4. Dependencias

```
E1 (Fundaciones)
 ├──> E2 (Salas)  ──┐
 ├──> E3 (Motor)  ──┤
 │                  ├──> E4 (Tiempo real) ──> E5 (UI juego) ──> E6 (Robustez)
 └──> E5 (UI base) ─┘                                              │
                                                                   ▼
                                          E7 (Responsive/UX) ──> E8 (Despliegue)
```

**Dependencias clave:**
- **E1 bloquea todo.** Sin esqueleto no hay nada.
- **E3 (motor) y E2 (salas) son independientes entre sí** → puedes alternar para no aburrirte, pero **E3 es el riesgo técnico nº1**.
- **E4 depende de E2 + E3**: necesitas salas donde sincronizar y un estado que sincronizar.
- **E5 depende de E4** para datos reales (aunque la UI base puede maquetarse antes con datos falsos/mock).
- **E6 depende de E4/E5** funcionando (no tiene sentido manejar reconexión sin juego).
- **E8 puede hacerse pronto y en paralelo** (desplegar el esqueleto desde el día 1 evita sorpresas de WebSocket en producción).

**Camino crítico:** `E1 → E3 → E4 → E5`. El motor de reglas es lo que más tiempo y bugs consumirá.

---

## 5. Roadmap de desarrollo

Fases con entregable jugable, no fechas rígidas. Cada fase termina en algo demostrable.

### Fase 0 — Esqueleto vivo *(E1 + arranque de E8)*
**Meta:** cliente y servidor hablando por WebSocket, desplegado en producción.
**Entregable:** abres la web, ves "conectado" desde dos pestañas.
> Riesgo que mata aquí: WebSockets en producción. Desplegar ya evita sorpresas al final.

### Fase 1 — Salas y lobby *(E2)*
**Meta:** crear partida, compartir código, unirse, ver jugadores en el lobby.
**Entregable:** tú y un amigo coincidís en la misma sala (sin juego aún).

### Fase 2 — Motor de juego en aislamiento *(E3)*
**Meta:** reglas de Parchís completas + tests, **sin UI todavía**.
**Entregable:** suite de tests verde que simula partidas completas por código.
> Es la fase más larga y la más importante. No la mezcles con la UI: depura la lógica sola.

### Fase 3 — Juego conectado básico *(E4 + E5 mínima)*
**Meta:** tablero real, tirar dado, mover ficha, ver el estado sincronizado entre jugadores.
**Entregable:** **primera partida completable** (aunque fea). *Este es el verdadero MVP funcional.*

### Fase 4 — Robustez *(E6)*
**Meta:** que no se rompa si alguien recarga, se cae el wifi o abandona.
**Entregable:** partida que sobrevive a desconexiones reales.

### Fase 5 — Pulido y responsive *(E7)*
**Meta:** que se vea y se juegue bien en móvil y escritorio.
**Entregable:** experiencia presentable para enseñar a amigos sin disculparte.

### Fase 6 — Lanzamiento *(cierre de E8)*
**Meta:** dominio, monitorización, prueba real multijugador.
**Entregable:** versión 1.0 jugada por 4 amigos en 4 dispositivos.

---

## 6. Recomendaciones finales

1. **El MVP de verdad termina en la Fase 3.** Todo lo posterior es mejora; podrías invitar a amigos a probar ahí.
2. **Invierte en tests del motor (E3).** El 80% de los bugs de Parchís vienen de casos raros (barreras, contar exacto a meta, tres 6). Los tests te ahorrarán días.
3. **Despliega desde el día 1.** WebSocket en local funciona "siempre"; en producción tiene matices (proxies, HTTPS/WSS).
4. **No persistas en BD al principio.** Estado en memoria es suficiente hasta que el juego funcione. Añadir Redis/SQLite es una tarea pequeña y tardía.
5. **Resiste la tentación de features.** Chat, bots, ranking… son agujeros de tiempo. Lánzalo simple, juega con amigos, y deja que el uso real decida la v2.
