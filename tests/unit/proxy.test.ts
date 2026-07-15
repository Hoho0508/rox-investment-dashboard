import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { proxy } from "@/proxy";

const secret = "a-secure-session-secret-with-at-least-32-characters";

afterEach(() => delete process.env.SESSION_SECRET);

describe("私人網站 proxy", () => {
  it("未登入頁面導向登入、API 回傳 401", async () => {
    process.env.SESSION_SECRET = secret;
    const pageResponse = await proxy(
      new NextRequest("https://example.com/history"),
    );
    expect(pageResponse.status).toBe(307);
    expect(pageResponse.headers.get("location")).toContain(
      "/login?next=%2Fhistory",
    );
    const apiResponse = await proxy(
      new NextRequest("https://example.com/api/journal"),
    );
    expect(apiResponse.status).toBe(401);
  });

  it("有效 session 可存取頁面", async () => {
    process.env.SESSION_SECRET = secret;
    const token = await createSessionToken(secret);
    const request = new NextRequest("https://example.com/history", {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    expect((await proxy(request)).status).toBe(200);
  });

  it("Cron endpoint 不受登入 cookie 影響，仍由自身密鑰保護", async () => {
    for (const path of ["morning-report", "midday-report", "closing-report"]) {
      const response = await proxy(
        new NextRequest(`https://example.com/api/cron/${path}`),
      );
      expect(response.status).toBe(200);
    }
  });
});
