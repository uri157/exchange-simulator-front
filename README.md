This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Configuración de entorno

1. Copiá el archivo `.env.local.example` a `.env.local` para definir tus variables de entorno locales:

   ```bash
   cp .env.local.example .env.local
   ```

2. Ajustá los valores según el entorno donde corra el backend:
   - `NEXT_PUBLIC_API_BASE_URL`: Base HTTP para las requests REST (sin `/` al final).
   - `NEXT_PUBLIC_WS_BASE_URL`: Base del WebSocket opcional. Si no se define, el front la deduce usando el origin o la base de la API.
   - `NEXT_PUBLIC_WS_PATH`: Path expuesto por el backend para el WebSocket (con `/` inicial).

Ejemplo para producción:

```
NEXT_PUBLIC_API_BASE_URL=https://api.mi-dominio.com
NEXT_PUBLIC_WS_BASE_URL=wss://api.mi-dominio.com
NEXT_PUBLIC_WS_PATH=/ws
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
















(Opcional) README.md

Notas rápidas: cómo resetear DB (borrar data/market.duckdb*) y cómo inspeccionar el esquema.