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
}

main().finally(() => prisma.$disconnect());
