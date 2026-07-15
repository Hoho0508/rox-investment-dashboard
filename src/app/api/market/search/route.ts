import { requireOwnerSession } from "@/lib/auth/request";
import { searchTaiwanSecurities } from "@/lib/market";

export async function GET(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 40)
    return Response.json({ error: "搜尋文字過長。" }, { status: 400 });
  return Response.json(await searchTaiwanSecurities(query, 20), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
