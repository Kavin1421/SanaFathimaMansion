import { SwaggerUiClient } from "@/components/docs/swagger-ui-client";
import { authOptions } from "@/lib/auth-options";
import { isSuperAdminSession } from "@/lib/super-admin";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ApiDocsPage() {
  const session = await getServerSession(authOptions);
  if (!isSuperAdminSession(session)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">API Docs (Swagger)</h2>
        <p className="text-sm text-muted-foreground">Interactive OpenAPI docs for all project endpoints.</p>
      </div>
      <SwaggerUiClient />
    </div>
  );
}
