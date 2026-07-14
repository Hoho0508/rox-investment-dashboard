import { prisma } from "@/lib/db/client";
import { taipeiDate } from "@/lib/reports/calendar";
import {
  generateMorningReport,
  validateScenarioTotal,
} from "@/lib/reports/generate";
import type { MorningReport } from "@/types/domain";

export async function saveReport(report: MorningReport) {
  if (!validateScenarioTotal(report))
    throw new Error("情境機率合計必須為 100%。");
  return prisma.morningReport.upsert({
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
    update: {},
  });
}

export async function getLatestReport(): Promise<MorningReport | null> {
  const row = await prisma.morningReport.findFirst({
    orderBy: { generatedAt: "desc" },
  });
  return row
    ? ({ ...JSON.parse(row.payload), id: row.id } as MorningReport)
    : null;
}

export async function getReportHistory() {
  return prisma.morningReport.findMany({
    orderBy: { reportDate: "desc" },
    take: 90,
  });
}

export async function runMorningReportJob(
  options: { now?: Date; force?: boolean } = {},
) {
  const startedAt = Date.now();
  const now = options.now ?? new Date();
  const reportDate = taipeiDate(now);
  const existing = await prisma.morningReport.findUnique({
    where: { reportDate_reportType: { reportDate, reportType: "morning" } },
  });
  if (existing && !options.force)
    return { status: "duplicate" as const, id: existing.id, reportDate };
  const maxRetries = Math.max(
    0,
    Math.min(3, Number(process.env.REPORT_MAX_RETRIES ?? 2)),
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const run = await prisma.jobRun.create({
      data: {
        jobName: "morning-report",
        reportDate,
        status: "running",
        attempt,
      },
    });
    try {
      const report = await generateMorningReport(now);
      const stored = await saveReport(report);
      await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "success",
          completedAt: new Date(),
          durationMs: Date.now() - startedAt,
          missingData: JSON.stringify(report.missingData),
        },
      });
      return { status: "created" as const, id: stored.id, reportDate };
    } catch (error) {
      lastError = error;
      await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          durationMs: Date.now() - startedAt,
          errorMessage:
            error instanceof Error ? error.message.slice(0, 500) : "未知錯誤",
        },
      });
    }
  }
  throw lastError;
}
