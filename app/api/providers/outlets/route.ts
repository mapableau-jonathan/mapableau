import { getProviderOutlets } from "@/lib/provider-outlets";

/**
 * GET /api/providers/outlets
 * Returns provider outlets from NDIS live list (when NDIS_PROVIDER_LIST_URL set)
 * or from local public/data/provider-outlets.json. Proxies NDIS server-side to avoid CORS.
 */
export async function GET() {
  try {
    const data = await getProviderOutlets();
    return Response.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load provider outlets";
    return Response.json({ error: message }, { status: 502 });
  }
}
