import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function hasOwnerSession() {
  const store = await cookies();
  return verifySessionToken(
    store.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
}

export async function requireOwnerSession() {
  if (!(await hasOwnerSession()))
    return Response.json({ error: "請先登入。" }, { status: 401 });
  return null;
}
