# PAR-007 · Despliegue del esqueleto · Guía de ejecución

> **Estado:** repo dejado **deploy-ready** por el equipo (IaC + verificación local). Los pasos que requieren **tus cuentas** (GitHub, Render, Vercel) están marcados con 👤 y solo los puedes hacer tú.
>
> **DoD del ticket y del Sprint 0:** abrir la URL pública en dos pestañas/dispositivos → ambas muestran 🟢; parar el backend → 🔴.

---

## Lo que ya está hecho (automatizable)

- [x] **`tsx` movido a dependencias de runtime** del servidor (sobrevive a `NODE_ENV=production`).
- [x] **`render.yaml`** — Blueprint del backend (build, start, health check, Node 20.18.1, `CLIENT_ORIGIN`).
- [x] **`vercel.json`** — build del cliente desde el monorepo + fallback SPA.
- [x] **`.node-version`** = 20.18.1 (fija la versión de Node en los hosts).
- [x] **`.env.example`** en `server/` y `client/` documentando las variables.
- [x] **Verificado en local:** `npm run start --workspace server` responde `/health` con `PORT`/`CLIENT_ORIGIN`; `vite build` genera `client/dist`.

---

## Orden de despliegue (hay un huevo-y-gallina con las URLs)

El backend necesita la URL del frontend (`CLIENT_ORIGIN`) y el frontend necesita la del backend (`VITE_SERVER_URL`). Se resuelve en 4 pasos:

### 1. 👤 Subir el repo a GitHub
```powershell
git remote add origin https://github.com/<tu-usuario>/parchis.git
git push -u origin main
```
> El commit inicial ya está creado; solo falta el remoto y el push.

### 2. 👤 Desplegar el backend en Render
1. Render → **New** → **Blueprint** → conecta el repo. Detecta `render.yaml` y crea `parchis-server`.
2. En la primera build, deja `CLIENT_ORIGIN` vacío (o `*`) — aún no hay frontend.
3. Espera a que quede *live*. Anota la URL pública, p. ej. `https://parchis-server.onrender.com`.
4. Verifica: abre `https://parchis-server.onrender.com/health` → `{ "ok": true }`.

### 3. 👤 Desplegar el frontend en Vercel
1. Vercel → **Add New Project** → importa el repo. `vercel.json` ya define build/output.
2. **Environment Variables** → añade `VITE_SERVER_URL` = la URL de Render del paso 2.
   > ⚠️ Vite inyecta esta variable **en build**: debe estar antes de compilar. Si la añades después, hay que **redeploy**.
3. Deploy. Anota el dominio, p. ej. `https://parchis.vercel.app`.

### 4. 👤 Cerrar el círculo (CORS)
1. En Render → servicio → **Environment** → `CLIENT_ORIGIN` = el dominio de Vercel del paso 3.
2. Guarda → Render redeploya solo.

---

## Verificación final (DoD)

- [ ] `https://<backend>.onrender.com/health` → `{ ok: true }`.
- [ ] Abrir el dominio de Vercel en **dos pestañas** → ambas muestran 🟢 **Conectado**.
- [ ] Parar el servicio en Render → ambas pasan a 🔴 **Desconectado**.
- [ ] Reanudar → vuelven a 🟢 (reconexión automática de socket.io).

Cuando estas casillas estén marcadas, **el Sprint 0 está cerrado** y el riesgo de WebSockets en producción queda liquidado.

---

## Notas y gotchas

- **Free tier de Render duerme** tras inactividad: la primera conexión tras un rato tarda ~30–60 s en "despertar". Normal en el plan gratuito; no es un bug.
- **WSS automático:** al apuntar `VITE_SERVER_URL` a `https://…`, socket.io negocia `wss://` solo. No hay que configurar nada.
- **Si cambias el dominio de Vercel** (o añades uno propio), actualiza `CLIENT_ORIGIN` en Render.
- **Alternativas equivalentes:** Railway o Fly.io para el backend (también soportan WebSockets); el `render.yaml` es específico de Render, pero `startCommand`/`buildCommand` sirven de referencia para cualquiera.
