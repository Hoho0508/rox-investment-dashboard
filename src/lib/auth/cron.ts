import { timingSafeEqual } from "node:crypto";

export function isValidCronRequest(request: Request) {
  const configured = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;
  const provided = authorization.slice(7);
  const left = Buffer.from(configured);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}
