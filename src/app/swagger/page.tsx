// app/swagger/page.tsx
import { API_BASE_URL } from "@/lib/env";
import { Button } from "@/components/ui/button";

export default function SwaggerPage() {
  const url = `https://petstore.swagger.io/?url=${encodeURIComponent(
    `${API_BASE_URL}/api-docs/openapi.json`
  )}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Swagger</h1>
      <Button asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Abrir documentación en una nueva pestaña
        </a>
      </Button>
      <p className="text-sm text-muted-foreground break-all">{url}</p>
    </div>
  );
}
