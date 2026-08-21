import { checkReadiness } from "@/lib/health/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkReadiness();
  return Response.json(result.body, {
    status: result.ready ? 200 : 503,
    headers: { "cache-control": "no-store" }
  });
}
