import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const shortcuts = [
  {
    href: "/datasets",
    title: "Datasets",
    description: "Registrar y gestionar datasets listos para ingestión.",
  },
  {
    href: "/explorar",
    title: "Explorar mercado",
    description: "Consultar símbolos activos y descargar klines en tablas.",
  },
  {
    href: "/sessions",
    title: "Sesiones de replay",
    description: "Crear, iniciar, pausar o reanudar sesiones de mercado simulado.",
  },
  {
    href: "/account",
    title: "Cuenta",
    description: "Revisar balances asociados a una sesión específica.",
  },
  {
    href: "/swagger",
    title: "Swagger",
    description: "Documentación interactiva del backend exchange-simulator.",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Gestioná datasets, sesiones y streams del simulador de exchange.
          </p>
        </div>
        <Badge variant="secondary">Bots conectados: —</Badge>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => (
          <Card key={item.href} className="h-full">
            <Link href={item.href} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto text-sm text-primary">
                Ir a {item.title}
              </CardContent>
            </Link>
          </Card>
        ))}
      </section>
    </div>
  );
}
