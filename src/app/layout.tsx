import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";

import "@/app/globals.css";

import { Toaster } from "@/components/toaster";
import { QueryProvider } from "@/components/query-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Exchange Simulator",
  description: "Panel de control para el backend exchange-simulator",
};

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/datasets", label: "Datasets" },
  { href: "/explorar", label: "Explorar" },
  { href: "/sessions", label: "Sesiones" },
  { href: "/account", label: "Cuenta" },
  { href: "/swagger", label: "Swagger" },
];

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 border-r bg-background md:block">
        <div className="flex h-full flex-col">
          <div className="p-4 text-lg font-semibold">exchange-simulator</div>
          <Separator />
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1 p-4">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </ScrollArea>
        </div>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="text-base font-semibold">Exchange Simulator</div>
          <Badge variant="secondary" className="font-normal">
            API: {API_BASE_URL}
          </Badge>
        </header>
        <main className="p-4 md:p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
