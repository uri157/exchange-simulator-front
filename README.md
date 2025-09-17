# exchange-simulator-front

Interfaz Next.js para el backend **exchange-simulator** construida con App Router, TailwindCSS, shadcn/ui y TanStack Query.

## Requisitos

- Node.js 18+
- pnpm 8+

## Variables de entorno

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | URL base del backend REST | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | Host del WebSocket | `ws://localhost:3001` |
| `NEXT_PUBLIC_WS_PATH` | Path del WebSocket | `/ws` |

Colocá las variables en un archivo `.env.local` si necesitás personalizarlas.

## Scripts

```bash
pnpm install
pnpm dev        # inicia la app en http://localhost:3000
pnpm build      # compila para producción
pnpm start      # sirve la build
pnpm lint       # ejecuta ESLint
```

> **Nota:** En este entorno de ejercicios el registro NPM puede requerir autenticación. Si `pnpm install` falla con `ERR_PNPM_FETCH_403`, configurá un mirror accesible o instalá manualmente los paquetes.

## Regenerar tipos de API

Los tipos de la API REST se generan desde Swagger con `openapi-typescript`:

```bash
pnpm generate:api-types
```

El comando descargará el esquema desde `http://localhost:3001/api-docs/openapi.json` y escribirá `src/lib/api-types.ts`.

## Flujo de uso

### Datasets
1. Navegá a **Datasets**.
2. Registrá un dataset indicando nombre, ruta y formato.
3. Usá el botón **Ingestar** de cada fila para disparar la ingesta. El listado se puede refrescar con **Actualizar**.

### Explorar
1. En **Explorar mercado**, seleccioná un símbolo activo y un intervalo (o ingresá uno personalizado).
2. Definí fechas en epoch ms y límite de filas.
3. Presioná **Buscar klines** para mostrar las velas en una tabla y ver el contador de filas devueltas.

### Sesiones
1. En **Sesiones**, completá el formulario (símbolos separados por coma, intervalo, rango temporal, velocidad y seed) y creá la sesión.
2. Desde el listado, controlá cada sesión con **Start**, **Pause**, **Resume** o abrí el **Detalle**.
3. En el detalle podés iniciar/pausar/seekear y conectar un stream WebSocket. Las últimas velas recibidas aparecen en la tabla y el badge indica bots conectados cuando el backend envía `stats`.

### Cuenta
1. Entrá en **Cuenta**.
2. Elegí una sesión desde el selector (persistido en la URL).
3. Se listan los balances (`asset`, `free`, `locked`) retornados por `/api/v3/account`.

### Swagger

La vista **Swagger** embebe la documentación interactiva del backend en un iframe para consultar contratos rápidamente.
