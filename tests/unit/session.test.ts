import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/lib/auth/session";
import { verifyAccessPassword } from "@/lib/auth/password";

const secret = "a-secure-session-secret-with-at-least-32-characters";

describe("單人登入 session", () => {
  it("接受有效且未過期的簽章 session", async () => {
    const now = Date.UTC(2026, 6, 15);
    const token = await createSessionToken(secret, now);
    await expect(verifySessionToken(token, secret, now + 1_000)).resolves.toBe(
      true,
    );
  });

  it("拒絕遭竄改、密鑰錯誤與過期 session", async () => {
    const now = Date.UTC(2026, 6, 15);
    const token = await createSessionToken(secret, now);
    await expect(verifySessionToken(`${token}x`, secret, now)).resolves.toBe(
      false,
    );
    await expect(
      verifySessionToken(token, `${secret}-different`, now),
    ).resolves.toBe(false);
    await expect(
      verifySessionToken(
        token,
        secret,
        now + (SESSION_MAX_AGE_SECONDS + 1) * 1_000,
      ),
    ).resolves.toBe(false);
  });

  it("密碼使用固定時間比較並拒絕過短設定", () => {
    expect(verifyAccessPassword("correct-password", "correct-password")).toBe(
      true,
    );
    expect(verifyAccessPassword("wrong-password", "correct-password")).toBe(
      false,
    );
    expect(verifyAccessPassword("short", "short")).toBe(false);
  });
});
