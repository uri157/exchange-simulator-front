# Exchange Simulator Frontend (Next.js)

**Next.js** (App Router) app to visualize *replay* sessions, connect via **WebSocket** to candle streams, and operate against the backend’s REST API.

---

## Requirements

* **Node.js** 18.18+ or 20.x (LTS recommended)
* **npm** / **pnpm** / **yarn** (use your preference)
* The **exchange-simulator** backend running (defaults to `http://localhost:3001`)

---

## Installation

```bash
# Clone the repo and enter the directory
git clone <frontend-repo-url>
cd exchange-simulator-front

# Install dependencies
npm install
# or pnpm install / yarn
```

---

## Environment variables

Create a **`.env.local`** file at the project root. You can copy the example:

```bash
cp .env.local.example .env.local
```

### `.env.local.example`

```dotenv
# Base HTTP for REST requests (no trailing slash)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# WebSocket base. Use wss:// in production behind HTTPS
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001

# Backend WebSocket path (leading slash required)
NEXT_PUBLIC_WS_PATH=/ws
```

> **Notes**
>
> * If you deploy the backend to a different domain/port, update these values.
> * In production, use `wss://` for a secure WebSocket.

---

## Run in development

```bash
npm run dev
# or pnpm dev / yarn dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Useful scripts

```bash
npm run dev        # Development (Next + Turbopack)
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # Lint with ESLint
```

---

## Usage flow

1. **Create a session** at `/sessions` (choose symbols, interval, and range).
2. **Open the session detail** page.
3. **Connect the WS stream** from the “Live stream” panel.

   * You’ll see the **consumed URL** and **query** (handy for debugging).
   * The **Received** counter increments as candles arrive.
4. **Start / Pause / Resume / Seek** control the backend replay.
5. If the session is **disabled**, WS and control buttons are blocked.

---

## WebSocket (expected behavior)

* The frontend builds the URL with:

  * Base: `NEXT_PUBLIC_WS_BASE_URL`
  * Path: `NEXT_PUBLIC_WS_PATH` (default `/ws`)
  * Query: `?sessionId=<UUID>&streams=<STREAMS>`

* Supported message format (current backend):

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

* **Stats** messages (if the backend emits them):

  ```json
  { "event": "stats", "data": { "connections": 3 } }
  ```

The frontend **does not** close the connection when idle (idle connections are allowed).

---

## Relevant REST endpoints

> The backend API may evolve—check its repo. These are the ones currently consumed by the frontend:

* `GET /api/v1/sessions` — list sessions
* `POST /api/v1/sessions` — create session
* `GET /api/v1/sessions/:id` — detail
* `POST /api/v1/sessions/:id/start` — start
* `POST /api/v1/sessions/:id/pause` — pause
* `POST /api/v1/sessions/:id/resume` — resume
* `POST /api/v1/sessions/:id/seek?to=<ms>` — seek to timestamp
* `PATCH /api/v1/sessions/:id/enable` — enable
* `PATCH /api/v1/sessions/:id/disable` — disable
* `DELETE /api/v1/sessions/:id` — delete

---

## Troubleshooting

* **No candles visible:**

  * Check that **WS_CONSUMED_URL** and **WS_CONSUMED_QUERY** (shown in the UI) include the correct `sessionId` and `streams`.
  * Make sure the session is **enabled** and in the correct state (after “Start”).
  * Confirm the session’s range overlaps real data (curl the backend’s `/api/v1/market/klines` or `/api/v3/klines`).

* **CORS / WS blocked:**

  * Ensure the backend has permissive CORS in dev.
  * In production, use `wss://` and configure proxies/reverse ports.

* **WS close codes:**

  * `1000`: normal close.
  * `1006`: abnormal close (check network/proxy).
  * `1011`: internal error / keepalive timeout on the server side.

* **Changing domains:**

  * Adjust `.env.local` (API and WS), then restart `npm run dev`.

---

## Style & libraries

* **Next.js 15 / React 19** (App Router)
* **TypeScript**
* **shadcn/ui**, **Radix**, **tailwindcss**
* **ESLint** integrated (`npm run lint`)
