# Fase 2 — Motor de Juego (Épica E3) · Detalle

> **Objetivo de la fase:** implementar las reglas completas de Parchís de forma **autoritativa, pura y sin UI**, validadas con una suite de tests que simule partidas enteras.
>
> **Entregable:** módulo `engine` con tests verdes. Dado un estado y una acción, devuelve el nuevo estado o un error. Sin red, sin React, sin sockets.
>
> **Principio rector:** el motor es una **función pura**. `nuevoEstado = reducir(estado, accion)`. Misma entrada → misma salida. Toda la aleatoriedad (dado) entra como dato, nunca se genera dentro de la lógica de reglas (se inyecta, para poder testear con dados fijos).

---

## 1. Modelo del tablero (T3.1)

### 1.1 Topología

El tablero de Parchís se modela como **un único recorrido lineal por color**, no como coordenadas X/Y. La posición visual (píxeles) es problema de la UI (Fase 3), **no del motor**.

Constantes del tablero:

| Constante | Valor | Significado |
|---|---|---|
| `CASILLAS_ANILLO` | 68 | Casillas del anillo exterior compartido (0–67) |
| `CASILLAS_PASILLO` | 7 | Casillas del pasillo de color de cada jugador |
| `META` | 1 | Casilla final (posición 8 del tramo final) |
| `FICHAS_POR_JUGADOR` | 4 | — |
| `COLORES` | rojo, azul, amarillo, verde | Orden de turno |

### 1.2 Salidas y entradas a pasillo

Cada color recorre el **mismo anillo de 68 casillas** pero empieza en una casilla distinta y se desvía a su pasillo en un punto distinto.

| Color | Casilla de salida (entra del garaje) | Última casilla del anillo antes de desviar al pasillo |
|---|---|---|
| Rojo | 0 | 63 |
| Azul | 17 | 12 |
| Amarillo | 34 | 29 |
| Verde | 51 | 46 |

> Es decir, cada color recorre 68 casillas de anillo (su salida + 67 más) y después entra en su pasillo de 7 + meta. El "punto de desvío" es la casilla anterior a su propia salida.

### 1.3 Casillas seguras (seguros)

En un seguro **no se puede comer** y pueden convivir fichas de distinto color sin capturarse.

- Las **4 casillas de salida** (0, 17, 34, 51) son seguros.
- Seguros intermedios (estrellas): **7, 12, 22, 29, 39, 46, 56, 63**.
- Todo el **pasillo de color y la meta** son implícitamente seguros (solo entra el propio color).

> Estos valores son una convención; se centralizan en una constante `CASILLAS_SEGURAS` para poder ajustarlos sin tocar la lógica.

### 1.4 Representación de la posición de una ficha

Cada ficha es una **máquina de estados** con 4 zonas:

```
GARAJE  ──(saca con 5)──►  ANILLO  ──(da la vuelta)──►  PASILLO  ──(cuenta exacto)──►  META
```

| Zona | Campo | Rango |
|---|---|---|
| `GARAJE` | — | la ficha aún no está en juego |
| `ANILLO` | `casilla` | 0–67 (coordenada global compartida) |
| `PASILLO` | `paso` | 1–7 (casillas del pasillo propio) |
| `META` | — | ficha terminada |

Conversión clave del motor: dada una ficha de color `C` en el anillo, calcular **cuántas casillas ha avanzado desde su salida** (`recorrido = (casilla - salida[C] + 68) % 68`). Cuando `recorrido + dado` supera el final del anillo, la ficha entra en el pasillo. Esta función de proyección es el corazón geométrico del motor y debe tener tests propios.

---

## 2. Estructura del estado de partida (T3.2)

Estado **serializable** (JSON puro, sin clases con métodos), para poder enviarlo por WebSocket en la Fase 4 y guardar snapshots.

```
EstadoPartida {
  id: string
  fase: "EN_CURSO" | "TERMINADA"
  colores: ["rojo", "azul", ...]        // 2–4, en orden de turno
  turnoActual: color                    // de quién es el turno
  dado: number | null                   // último valor tirado, pendiente de usar
  segundosSeises: number                // contador de 6 consecutivos (0,1,2)
  tiradaExtra: boolean                  // si el turno repite
  ultimaFichaMovida: { color, id } | null   // para el castigo de tres seises (última movida)
  bonusPendiente: { tipo: "+20" | "+10" } | null   // bonificación manual sin resolver
  fichas: {
    [color]: [
      { id: 0, zona: "GARAJE" },
      { id: 1, zona: "ANILLO", casilla: 23 },
      { id: 2, zona: "PASILLO", paso: 4 },
      { id: 3, zona: "META" }
    ]
  }
  ganador: color | null
  historial: Evento[]                   // log de acciones (para depurar y para la UI)
}
```

### Acciones que acepta el motor

```
TIRAR_DADO            { jugador, valor }        // valor inyectado (test) o del RNG (prod)
MOVER_FICHA           { jugador, fichaId }
PASAR_TURNO           { jugador }                // cuando no hay jugada legal
```

### Salida del motor

```
reducir(estado, accion) -> {
  estado: EstadoPartida,     // nuevo estado
  eventos: Evento[],         // qué pasó (comió, llegó a meta, tres seises...)
  error: string | null       // jugada ilegal => estado sin cambios
}
```

---

## 3. Reglas a implementar (T3.3 – T3.11)

Cada regla = una unidad pequeña, testeable por separado, antes de integrarlas.

### T3.3 · Tirada de dado
- El valor se **inyecta** en la acción (RNG fuera del motor).
- Solo el jugador en turno puede tirar, y solo si `dado === null`.
- Guarda el valor en `estado.dado` y actualiza `segundosSeises`.

### T3.4 · Cálculo de movimientos legales
Función central `jugadasLegales(estado, color, dado) -> fichaId[]`. Recorre las 4 fichas del color y para cada una decide si puede moverse con ese dado:
- En `GARAJE`: legal **solo si `dado === 5`** y la salida no está bloqueada por barrera propia.
- En `ANILLO`/`PASILLO`: legal si el destino calculado no se pasa de meta (cuenta exacta) y no cruza una barrera.
- En `META`: nunca movible.

> Si la lista sale vacía → no hay jugada → se aplica `PASAR_TURNO` (o turno extra si tocaba).

### T3.5 · Aplicar movimiento + comer (+20)
1. Calcular casilla destino.
2. Si en el destino hay **una** ficha rival y **no es seguro** → se la come: la rival vuelve a `GARAJE`.
3. Comer otorga **+20**: avanzar 20 casillas con **una ficha propia a elección** (jugada encadenada) y **turno extra**.
4. Si el destino es seguro o está vacío → solo se mueve.

> Diseño (FIJADO: bonus manual): el "+20" y el "+10" se modelan como `bonusPendiente` en el estado. Tras comer/llegar, el motor **no avanza solo**: queda a la espera de una segunda acción `MOVER_FICHA` del mismo jugador eligiendo qué ficha aplica la bonificación. Si ninguna ficha puede usar legalmente el bonus (p. ej. todas bloqueadas), el bonus se descarta y el turno continúa con la tirada extra.

### T3.6 · Salir del garaje (regla del 5)
- Con un 5, la ficha pasa de `GARAJE` a `ANILLO` en `salida[color]`.
- Si la salida está ocupada por **dos fichas propias** (barrera), no se puede salir.
- Si está ocupada por una rival → se la come (la salida es seguro… **excepción clásica**: en muchas variantes salir comiéndose al rival de la propia salida sí está permitido; **decisión a fijar** y documentar en constante `COMER_EN_SALIDA`).

### T3.7 · Llegada a meta (+10) y cuenta exacta
- Entrar en la meta requiere **número exacto**; si el dado se pasa, la jugada con esa ficha es **ilegal**.
- Llegar a meta otorga **+10** (avanzar 10 con otra ficha) y **turno extra**.

### T3.8 · Barreras / puentes
- Dos fichas del **mismo color** en la misma casilla del anillo forman **barrera**: ninguna ficha (de ningún color) puede **pasar por encima ni aterrizar** ahí.
- Implementar como comprobación en `jugadasLegales`: recorrer las casillas intermedias del trayecto y rechazar si hay barrera en el camino.
- Decisión a fijar: ¿un 6 obliga a romper la barrera propia? (regla común). Documentar en `SEIS_ROMPE_BARRERA`.

### T3.9 · Turno extra y rotación
Se repite turno si: sale **6**, **come** una ficha, o **mete una ficha en meta**. En cualquier otro caso, el turno pasa al siguiente color de `estado.colores`. Tras resolver una jugada, `estado.dado` vuelve a `null`.

### T3.10 · Regla de los tres seises
- `segundosSeises` cuenta 6 consecutivos del mismo turno.
- Al tercer 6: **no se mueve**, la **última ficha movida** en el turno (`ultimaFichaMovida`) vuelve al `GARAJE`, el contador se reinicia y el turno pasa.
- Caso de borde: si en el turno no se llegó a mover ninguna ficha (`ultimaFichaMovida === null`), no se castiga ninguna.

### T3.11 · Condición de victoria
- Un color gana cuando sus **4 fichas** están en `META`.
- `estado.fase = "TERMINADA"`, `estado.ganador = color`. A partir de ahí toda acción devuelve error.

---

## 4. Casos límite a cubrir (lista de verificación)

Estos son los que generan el 80% de los bugs. Cada uno debe tener su test:

- [ ] Dado distinto de 5 con todas las fichas en garaje → no hay jugada → pasa turno.
- [ ] Salir del garaje comiendo (o no, según `COMER_EN_SALIDA`).
- [ ] Cuenta exacta a meta: dado mayor que lo necesario → ficha **no** movible.
- [ ] Última ficha entra a meta → victoria inmediata (sin pedir el +10).
- [ ] Comer otorga +20 y turno extra; encadenar +20 que **también** come.
- [ ] +20 que entraría a meta sin contar exacto → cómo se resuelve.
- [ ] Barrera propia bloquea la salida del garaje.
- [ ] Barrera ajena en mitad del trayecto bloquea el paso.
- [ ] Tres seises → vuelve la ficha más adelantada (probar con fichas en pasillo).
- [ ] Tercer 6 cuando la única ficha adelantada está en meta → no se toca meta (decisión a documentar).
- [ ] No se puede comer en seguro (conviven dos colores).
- [ ] Jugador que no es el del turno intenta actuar → error, estado intacto.
- [ ] Tirar dos veces sin mover → error (ya hay `dado` pendiente).
- [ ] Mover con `dado === null` → error.
- [ ] Partida de 2 y de 3 jugadores (rotación de turno con colores ausentes).

---

## 5. Estrategia de tests (T3.12)

Pirámide de tres niveles:

1. **Unitarios de geometría** — proyección anillo→pasillo, "más adelantada", detección de seguros y barreras. Son funciones puras, baratas y atrapan los errores más sutiles.
2. **Unitarios de regla** — un test por cada regla de la sección 3, con estado de entrada construido a mano y dado fijo.
3. **Integración / partidas simuladas** — secuencias de acciones con dados predeterminados que llevan a un estado conocido (incluida una partida completa hasta la victoria). Sirven de test de regresión.

Herramientas sugeridas: **Vitest** (encaja con Vite/TS). Construir *helpers* de test: `crearEstado(...)`, `conFicha(color, id, zona, pos)`, `tirar(valor)`, `mover(fichaId)` para que los tests se lean como una partida.

> Meta de cobertura: 100% de las ramas de `jugadasLegales` y de la resolución de bonificaciones. Es el código donde un bug arruina la partida.

---

## 6. Orden de construcción dentro de la fase

Construir de dentro hacia fuera, cada paso con sus tests antes de seguir:

1. **Constantes y modelo del tablero** (T3.1) + función de proyección anillo↔pasillo.
2. **Estructura de estado + creación de partida** (T3.2).
3. **Tirar dado** (T3.3) y **rotación básica de turno** (parte de T3.9).
4. **Movimiento simple en el anillo** sin comer ni barreras (núcleo de T3.4/T3.5).
5. **Salir del garaje** (T3.6).
6. **Comer + bonificación +20** (resto de T3.5).
7. **Pasillo, cuenta exacta y meta + bonificación +10** (T3.7).
8. **Barreras** (T3.8).
9. **Turno extra completo y tres seises** (T3.9 / T3.10).
10. **Victoria** (T3.11).
11. **Suite de partidas simuladas** (T3.12).

> Tras el paso 4 ya tienes algo "vivo" que mueve fichas; el resto son capas de reglas. Si en algún momento te bloqueas, ese punto es un buen sitio para conectar una UI mínima (Fase 3) y depurar visualmente.

---

## 7. Decisiones de reglas — FIJADAS ✅

Variantes confirmadas con el cliente (2026-06-06). Se centralizan como **flags** para mantener el motor configurable, pero estos son los valores definitivos del MVP:

| Flag | Decisión FIJADA | Afecta a |
|---|---|---|
| `COMER_EN_SALIDA` | **Sí** — al salir del garaje se come al rival solo que esté en la salida (+20 y turno extra) | T3.6 |
| `SEIS_ROMPE_BARRERA` | **Sí** — un 6 obliga a deshacer barrera propia si es la única jugada legal | T3.8 |
| `BONUS_ELECCION_MANUAL` | **Sí, desde el MVP** — el jugador elige qué ficha avanza el +20/+10 | T3.5/T3.7 |
| `META_CUENTA_EXACTA` | **Sí** — obligatorio número exacto para entrar a meta | T3.7 |
| `CASTIGO_TRES_SEISES` | **Última ficha movida** — vuelve a casa la ficha que se movió en el turno, no la más adelantada | T3.10 |

> **Impacto de `BONUS_ELECCION_MANUAL = Sí`:** el +20/+10 no se auto-aplica. El motor entra en un sub-estado "bonificación pendiente" y espera una segunda acción `MOVER_FICHA` del mismo jugador. Esto añade lógica de jugada encadenada (PAR-206/207) y algo de UI ya en el MVP.
>
> **Impacto de `CASTIGO_TRES_SEISES = última movida`:** el estado debe recordar `ultimaFichaMovida` dentro del turno (ver §2). Si en el primer/segundo 6 no se movió ninguna ficha, definir el caso de borde (propuesta: si no hubo movimiento previo, no se castiga ninguna).

---

## 8. Definición de "Hecho" (Definition of Done) de la Fase 2

- [ ] Todas las reglas de la sección 3 implementadas como funciones puras.
- [ ] Todos los casos límite de la sección 4 cubiertos con test verde.
- [ ] Una partida completa de 4 jugadores simulada de principio a fin en un test.
- [ ] El motor **no importa** nada de red ni de UI (cero dependencias de `socket.io`/`react`).
- [ ] El estado es 100% serializable (pasa `JSON.parse(JSON.stringify(estado))` sin perder nada).
- [ ] Flags de reglas centralizados y documentados.

> Cuando esto esté verde, la Fase 3 (conectar tiempo real + tablero) es "solo fontanería": el riesgo difícil ya está resuelto.
