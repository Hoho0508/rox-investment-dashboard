import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F/);
  await page.getByLabel("存取密碼").fill("local-development-password");
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("未登入會導向登入，錯誤密碼不建立 session", async ({ page }) => {
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("存取密碼").fill("wrong-password-value");
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "密碼不正確" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("首頁顯示晨報、資料模式與固定聲明", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: /市場晨報/ })).toBeVisible();
  await expect(page.getByText("模擬資料", { exact: true })).toBeVisible();
  await expect(page.getByText(/不構成個人化投資建議/)).toBeVisible();
});

test("手機版可導覽至投資日誌", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "投資日誌" }).click();
  await expect(page.getByRole("heading", { name: "投資日誌" })).toBeVisible();
});
