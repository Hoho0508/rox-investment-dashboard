import { PrismaClient } from "@prisma/client";
import { generateMorningReport } from "../src/lib/reports/generate";

const prisma = new PrismaClient();

async function main() {
  const report = await generateMorningReport();
  await prisma.morningReport.upsert({
    where: {
      reportDate_reportType: {
        reportDate: report.reportDate,
        reportType: "morning",
      },
    },
    create: {
      reportDate: report.reportDate,
      latestDataAt: new Date(report.latestDataAt),
      dataMode: report.dataMode,
      completeness: report.completeness,
      isTradingDay: report.isTradingDay,
      marketView: report.marketView,
      payload: JSON.stringify(report),
    },
    update: {
      payload: JSON.stringify(report),
      latestDataAt: new Date(report.latestDataAt),
    },
  });
  for (const [sortOrder, stock] of [
    { symbol: "2330", name: "台積電", exchange: "TWSE" },
    { symbol: "2317", name: "鴻海", exchange: "TWSE" },
    { symbol: "2454", name: "聯發科", exchange: "TWSE" },
  ].entries()) {
    await prisma.watchlistItem.upsert({
      where: { symbol: stock.symbol },
      create: { ...stock, market: "TW", sortOrder },
      update: { name: stock.name, exchange: stock.exchange, sortOrder },
    });
  }
}

main().finally(() => prisma.$disconnect());
