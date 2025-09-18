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

















1. `src/components/ui/select.tsx`

   * Ajustar `SelectContent` para que tenga **fondo opaco**, **sombra**, **borde**, **máxima altura** y **overflow-y-auto** (scroll interno).
   * (Si ya permite `className`, solo agregar clases; si no, exponer la prop y aplicarla).

2. `src/app/datasets/page.tsx`

   * Pasar `className`/props al `SelectContent` del **intervalo** (scroll + fondo).
   * Reemplazar el `Select` de **símbolos** por un combobox **buscable** (ver punto 3).

3. **Nuevos componentes para combobox buscable** (patrón shadcn “Command + Popover”):

   * `src/components/ui/command.tsx` (wrapper del componente `cmdk`).
   * `src/components/ui/popover.tsx` (wrapper de `@radix-ui/react-popover`).
   * `src/components/ComboBox.tsx` (nuevo, reutilizable; recibe `options`, `value`, `onChange`, `placeholder`; filtra en vivo mientras tipeás y muestra lista con scroll y fondo).

> Nota de dependencias (si no están ya):
>
> * `cmdk`
> * `@radix-ui/react-popover`
>   (shadcn/ui suele usarlos; si no están en tu proyecto, hay que agregarlos en `package.json`).

Si te va, pasame primero **`src/components/ui/select.tsx`** y lo dejo con las clases de fondo/scroll. Luego te doy el **`ComboBox.tsx`** (+ `command.tsx` y `popover.tsx`) y por último te devuelvo el **`page.tsx`** actualizado para usar el combobox en “Par” y el `Select` con scroll en “Temporalidad”.
