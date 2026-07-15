import { describe, expect, it, vi } from "vitest";
import {
  OfficialGlobalMarketProvider,
  parseTreasuryYieldXml,
  rocDateToIso,
} from "@/lib/providers/official-global-market";

const twseFixture = [
  {
    日期: "1150714",
    指數: "發行量加權股價指數",
    收盤指數: "44,737.95",
    漲跌百分比: "-1.42",
  },
  {
    日期: "1150714",
    指數: "臺灣50指數",
    收盤指數: "41,455.31",
    漲跌百分比: "-1.36",
  },
  {
    日期: "1150714",
    指數: "臺灣資訊科技指數",
    收盤指數: "87,232.06",
    漲跌百分比: "-1.50",
  },
];

const treasuryFixture = `
<feed>
  <entry><content><m:properties>
    <d:NEW_DATE m:type="Edm.DateTime">2026-07-13T00:00:00</d:NEW_DATE>
    <d:BC_2YEAR m:type="Edm.Double">4.18</d:BC_2YEAR>
    <d:BC_10YEAR m:type="Edm.Double">4.53</d:BC_10YEAR>
  </m:properties></content></entry>
  <entry><content><m:properties>
    <d:NEW_DATE m:type="Edm.DateTime">2026-07-14T00:00:00</d:NEW_DATE>
    <d:BC_2YEAR m:type="Edm.Double">4.21</d:BC_2YEAR>
    <d:BC_10YEAR m:type="Edm.Double">4.56</d:BC_10YEAR>
  </m:properties></content></entry>
</feed>`;

describe("官方全球市場 Provider", () => {
  it("將民國日期與 Treasury XML 轉成可驗證資料", () => {
    expect(rocDateToIso("1150714")).toBe("2026-07-14");
    expect(parseTreasuryYieldXml(treasuryFixture)).toEqual([
      { date: "2026-07-13", US2Y: 4.18, US10Y: 4.53 },
      { date: "2026-07-14", US2Y: 4.21, US10Y: 4.56 },
    ]);
  });

  it("只回傳 TWSE 與 U.S. Treasury 的延遲正式資料", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("openapi.twse.com.tw"))
        return new Response(JSON.stringify(twseFixture), { status: 200 });
      return new Response(treasuryFixture, { status: 200 });
    }) as unknown as typeof fetch;
    const provider = new OfficialGlobalMarketProvider(
      fetcher,
      () => new Date("2026-07-15T01:00:00Z"),
    );

    const rows = await provider.getGlobalMarkets();

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.price.dataMode === "delayed")).toBe(true);
    expect(rows.every((row) => !row.price.sourceName.includes("Mock"))).toBe(
      true,
    );
    expect(rows.find((row) => row.symbol === "TAIEX")?.price.value).toBe(
      44_737.95,
    );
    expect(
      rows.find((row) => row.symbol === "US10Y")?.changePercent.value,
    ).toBeCloseTo(((4.56 - 4.53) / 4.53) * 100);
  });

  it("官方來源失敗時回 unavailable，不建立 Mock 資料", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network unavailable"));
    const provider = new OfficialGlobalMarketProvider(fetcher);

    const rows = await provider.getGlobalMarkets();

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.price.value === null)).toBe(true);
    expect(rows.every((row) => row.price.dataMode === "unavailable")).toBe(
      true,
    );
    expect(rows.every((row) => !row.price.sourceName.includes("Mock"))).toBe(
      true,
    );
  });
});
