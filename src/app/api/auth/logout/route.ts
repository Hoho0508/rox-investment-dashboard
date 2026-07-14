import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ success: true });
}
