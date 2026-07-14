export const SESSION_COOKIE = "rox_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  exp: number;
  scope: "owner";
};

function encode(value: string | Uint8Array) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decode(value: string) {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(secret: string, now = Date.now()) {
  const payload: SessionPayload = {
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
    scope: "owner",
  };
  const body = encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(secret),
    new TextEncoder().encode(body),
  );
  return `${body}.${encode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
) {
  if (!token || !secret || secret.length < 32) return false;
  const [body, encodedSignature, extra] = token.split(".");
  if (!body || !encodedSignature || extra) return false;
  try {
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      decode(encodedSignature),
      new TextEncoder().encode(body),
    );
    if (!validSignature) return false;
    const payload = JSON.parse(
      new TextDecoder().decode(decode(body)),
    ) as Partial<SessionPayload>;
    return (
      payload.scope === "owner" &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}
