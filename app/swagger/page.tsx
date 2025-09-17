import { API_BASE_URL } from "@/lib/env";

export default function SwaggerPage() {
  return (
    <div className="h-[70vh]">
      <iframe
        src={`${API_BASE_URL}/swagger-ui`}
        title="Swagger UI"
        className="h-full w-full rounded-lg border"
      />
    </div>
  );
}
