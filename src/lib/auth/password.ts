import { timingSafeEqual } from "node:crypto";

export function verifyAccessPassword(
  provided: unknown,
  configured = process.env.APP_ACCESS_PASSWORD,
) {
  if (typeof provided !== "string" || !configured || configured.length < 12)
    return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}
