import { afterEach, describe, expect, it } from "vitest";
import { isValidCronRequest } from "@/lib/auth/cron";

afterEach(() => delete process.env.CRON_SECRET);
describe("Cron 驗證", () => {
  it("拒絕錯誤密鑰", () => {
    process.env.CRON_SECRET = "correct-secret";
    expect(
      isValidCronRequest(
        new Request("http://localhost", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
      ),
    ).toBe(false);
  });
  it("接受正確密鑰", () => {
    process.env.CRON_SECRET = "correct-secret";
    expect(
      isValidCronRequest(
        new Request("http://localhost", {
          headers: { authorization: "Bearer correct-secret" },
        }),
      ),
    ).toBe(true);
  });
});
