# Exchange Simulator Frontend (Next.js)

Aplicación **Next.js** (App Router) para visualizar sesiones de *replay*, conectarse por **WebSocket** a los *streams* de velas y operar contra la API REST del backend.

---

## Requisitos

* **Node.js** 18.18+ o 20.x (recomendado LTS)
* **npm** / **pnpm** / **yarn** (usa el que prefieras)
* Backend del **exchange-simulator** corriendo (por defecto en `http://localhost:3001`)

---

## Instalación

```bash
# Clonar el repo y entrar al directorio
git clone <url-del-repo-front>
cd exchange-simulator-front

# Instalar dependencias
npm install
# o pnpm install / yarn
```

---

## Variables de entorno

Crea un archivo **`.env.local`** en la raíz del proyecto. Puedes copiar el ejemplo:

```bash
cp .env.local.example .env.local
```

### `.env.local.example`

```dotenv
# Base HTTP para las requests REST (sin slash final)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Base del WebSocket. Usa wss:// en producción detrás de HTTPS
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001

# Path expuesto por el backend para el WebSocket (con / inicial)
NEXT_PUBLIC_WS_PATH=/ws
```

> **Notas**
>
> * Si despliegas el backend en otro dominio/puerto, actualiza estos valores.
> * En producción, usa `wss://` para WebSocket seguro.

---

## Ejecutar en desarrollo

```bash
npm run dev
# o pnpm dev / yarn dev
```

Abre **[http://localhost:3000](http://localhost:3000)** en tu navegador.

---

## Scripts útiles

```bash
npm run dev        # Desarrollo (Next + Turbopack)
npm run build      # Build de producción
npm run start      # Servir build de producción
npm run lint       # Linter (ESLint)
```

---

## Flujo de uso

1. **Crear sesión** en `/sessions` (elige símbolos, intervalo y rango).
2. **Entrar al detalle** de la sesión.
3. **Conectar stream WS** desde el panel “Stream en vivo”.

   * Verás la **URL consumida** y la **query** (útil para depurar).
   * El contador de **Recibidas** crece al llegar velas.
4. **Start / Pause / Resume / Seek** controlan el *replay* en el backend.
5. Si la sesión está **deshabilitada**, los botones de WS y control se bloquean.

---

## WebSocket (comportamiento esperado)

* El front construye la URL con:

  * Base: `NEXT_PUBLIC_WS_BASE_URL`
  * Path: `NEXT_PUBLIC_WS_PATH` (por defecto `/ws`)
  * Query: `?sessionId=<UUID>&streams=<STREAMS>`
* Formato de mensajes soportado (backend actual):

  ```json
  {
    "event": "kline",
    "data": {
      "symbol": "ETHBTC",
      "interval": "1m",
      "openTime": 1758150240000,
      "closeTime": 1758150299999,
      "open": 0.03942,
      "high": 0.03946,
      "low": 0.03942,
      "close": 0.03946,
      "volume": 66.5555
    },
    "stream": "kline@1m:ETHBTC"
  }
  ```
* Mensajes de **stats** (si el backend los emite):

  ```json
  { "event": "stats", "data": { "connections": 3 } }
  ```

El front **no** corta la conexión si no hay datos (permite conexiones ociosas).

---

## Endpoints REST relevantes

> La API del backend puede evolucionar; valida en su repo. Estos son los consumidos actualmente por el front:

* `GET /api/v1/sessions` — listar sesiones
* `POST /api/v1/sessions` — crear sesión
* `GET /api/v1/sessions/:id` — detalle
* `POST /api/v1/sessions/:id/start` — iniciar
* `POST /api/v1/sessions/:id/pause` — pausar
* `POST /api/v1/sessions/:id/resume` — reanudar
* `POST /api/v1/sessions/:id/seek?to=<ms>` — buscar timestamp
* `PATCH /api/v1/sessions/:id/enable` — habilitar
* `PATCH /api/v1/sessions/:id/disable` — deshabilitar
* `DELETE /api/v1/sessions/:id` — borrar

---

## Troubleshooting

* **No veo velas**:

  * Verifica que el **WS\_CONSUMED\_URL** y **WS\_CONSUMED\_QUERY** (mostrados en la UI) tengan `sessionId` y `streams` correctos.
  * Asegúrate de que la sesión esté **habilitada** y en estado correcto (tras “Start”).
  * Confirma que el rango de la sesión intersecta con datos reales (curl contra `/api/v1/market/klines` o `/api/v3/klines` del backend).
* **CORS / WS bloqueado**:

  * Asegúrate de que el backend tenga CORS permisivo en dev.
  * En producción usa `wss://` y configura proxies/reverse-ports.
* **Códigos de cierre WS**:

  * `1000`: cierre normal.
  * `1006`: cierre anormal (ver red/proxy).
  * `1011`: error interno / keepalive timeout lado servidor.
* **Cambio de dominios**:

  * Ajusta `.env.local` (API y WS), reinicia `npm run dev`.

---

## Estilo y librerías

* **Next.js 15 / React 19** (app router)
* **TypeScript**
* **shadcn/ui**, **Radix**, **tailwindcss**
* **ESLint** integrado (`npm run lint`)

---

## Deploy

1. Configura las variables de entorno en el proveedor (Vercel/Nginx/…):

   * `NEXT_PUBLIC_API_BASE_URL`
   * `NEXT_PUBLIC_WS_BASE_URL` (usa `wss://` detrás de TLS)
   * `NEXT_PUBLIC_WS_PATH`
2. `npm run build` y servir con `npm run start` (o usa tu plataforma preferida).

---

## Contribuir

* Abre un issue/PR con descripción clara de la mejora/bug.
* Acompaña reproducciones (logs de **WS\_CONSUMED\_URL** ayudan mucho).

---

¡Listo! Con esto deberías poder levantar el front, apuntarlo a tu backend y depurar fácilmente tanto REST como WS.







































7. `src/infra/ws/broadcaster.rs` + configuración

   * Ya está el buffer mínimo; si seguís viendo lag, subir `WS_BUFFER` (p. ej. 4096–8192) en la config/env del backend.

---

Decime con cuál archivo del **frontend** querés empezar (si el WS vive dentro de `[id]/page.tsx`, pasame ese; si ya lo separaste, pasame `SessionStreamPanel.tsx`). Te lo devuelvo completo y corregido.
