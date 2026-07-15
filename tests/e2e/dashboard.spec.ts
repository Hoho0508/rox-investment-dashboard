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
  await expect(page.getByText("MOCK", { exact: true })).toBeVisible();
  await expect(page.getByText(/不構成個人化投資建議/)).toBeVisible();
});

test("每日報告可切換晨報、午盤與盤後", async ({ page }) => {
  await login(page);
  await page.goto("/reports?type=midday");
  await expect(page.getByRole("heading", { name: /午盤報告/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "立即產生午盤報告" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /盤後/ }).click();
  await expect(page.getByRole("heading", { name: /盤後報告/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "立即產生盤後報告" }),
  ).toBeVisible();
});

test("手機 App 安裝頁提供 iOS 或 Android 指引", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "安裝手機 App" }).click();
  await expect(page.getByRole("heading", { name: "安裝到手機" })).toBeVisible();
  await expect(page.getByText(/加入主畫面|安裝應用程式/)).toBeVisible();
});

test("手機版可導覽至投資日誌", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "投資日誌" }).click();
  await expect(page.getByRole("heading", { name: "投資日誌" })).toBeVisible();
});

test("可開啟台股 K 線、自選行情與歷史判斷", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "即時台股與 K 線" }).click();
  await expect(
    page.getByRole("heading", { name: "台股即時追蹤與數據分析" }),
  ).toBeVisible();
  await expect(page.getByLabel("股票代碼或名稱")).toBeVisible();
  await expect(page.getByRole("img", { name: /K 線圖/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "進場判斷" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "最相似的歷史市場情境" }),
  ).toBeVisible();
});

test("首頁顯示 AI 市場脈動且不把 Mock 當真實新聞", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "今日市場脈動" }),
  ).toBeVisible();
  await expect(
    page.getByText(/族群、資金流與市場主題為版型示範/),
  ).toBeVisible();
});

test("股票獨立頁預設顯示 1 分鐘 K 與可解釋技術評分", async ({ page }) => {
  await login(page);
  await page.goto("/stocks/2330");
  await expect(
    page.getByRole("heading", { name: "2330 技術分析中心" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "1 分", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("p.notice").filter({ hasText: "DATA_MODE=mock 的模擬分鐘 K" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "技術面判斷" })).toBeVisible();
  await expect(page.getByText("失效條件：", { exact: false })).toBeVisible();
});

test("新手研究中心顯示法說狀態、白話判斷與四個股票倉庫", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await login(page);
  await page.getByRole("link", { name: "新手研究中心" }).click();
  await expect(
    page.getByRole("heading", { name: "新手研究中心" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "近期法說雷達" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "新手快速判斷" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "主題股票倉庫" }),
  ).toBeVisible();
  for (const category of [
    "記憶體（10）",
    "AI（10）",
    "IC 晶片（10）",
    "權值股（10）",
  ])
    await expect(page.getByText(category, { exact: true })).toBeVisible();
  await expect(page.getByLabel("2408 南亞科")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "加入已選 0 檔" }),
  ).toBeDisabled();
  expect(
    consoleErrors.filter(
      (message) =>
        message.toLowerCase().includes("hydration") || message.includes("#418"),
    ),
  ).toEqual([]);
});
