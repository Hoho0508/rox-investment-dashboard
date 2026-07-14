import { cookies } from "next/headers";
import { verifyAccessPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
  } | null;
  if (!verifyAccessPassword(body?.password)) {
    return Response.json({ error: "密碼不正確。" }, { status: 401 });
  }
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json(
      { error: "登入功能尚未完成安全設定。" },
      { status: 503 },
    );
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return Response.json({ success: true });
}
