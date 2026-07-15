import { prisma } from "@/lib/db/client";
import { taipeiDate } from "@/lib/reports/calendar";
import { generateReport, validateScenarioTotal } from "@/lib/reports/generate";
import { REPORT_DEFINITIONS, type ReportType } from "@/lib/reports/config";
import type { DailyReport } from "@/types/domain";

function parseStoredReport(payload: string, id: string): DailyReport {
  const parsed = JSON.parse(payload) as Partial<DailyReport>;
  return {
    ...parsed,
    id,
    reportType: parsed.reportType ?? "morning",
  } as DailyReport;
}

export async function saveReport(report: DailyReport) {
  if (!validateScenarioTotal(report))
    throw new Error("情境機率合計必須為 100%。");
  return prisma.morningReport.upsert({
    where: {
      reportDate_reportType: {
        reportDate: report.reportDate,
        reportType: report.reportType,
      },
    },
    create: {
      reportDate: report.reportDate,
      reportType: report.reportType,
      latestDataAt: new Date(report.latestDataAt),
      dataMode: report.dataMode,
      completeness: report.completeness,
      isTradingDay: report.isTradingDay,
      marketView: report.marketView,
      payload: JSON.stringify(report),
    },
    update: {
      latestDataAt: new Date(report.latestDataAt),
      dataMode: report.dataMode,
      completeness: report.completeness,
      isTradingDay: report.isTradingDay,
      marketView: report.marketView,
      payload: JSON.stringify(report),
      generatedAt: new Date(report.generatedAt),
    },
  });
}

export async function getLatestReport(
  reportType: ReportType = "morning",
): Promise<DailyReport | null> {
  const row = await prisma.morningReport.findFirst({
    where: { reportType },
    orderBy: { generatedAt: "desc" },
  });
  if (!row) return null;
  const report = parseStoredReport(row.payload, row.id);
  return process.env.DATA_MODE === "live" && report.dataMode === "mock"
    ? null
    : report;
}

export async function getReportByDate(
  reportDate: string,
  reportType: ReportType,
): Promise<DailyReport | null> {
  const row = await prisma.morningReport.findUnique({
    where: { reportDate_reportType: { reportDate, reportType } },
  });
  if (!row) return null;
  const report = parseStoredReport(row.payload, row.id);
  return process.env.DATA_MODE === "live" && report.dataMode === "mock"
    ? null
    : report;
}

export async function getReportHistory() {
  return prisma.morningReport.findMany({
    orderBy: { reportDate: "desc" },
    take: 90,
  });
}

export async function runReportJob(
  reportType: ReportType,
  options: { now?: Date; force?: boolean } = {},
) {
  const startedAt = Date.now();
  const now = options.now ?? new Date();
  const reportDate = taipeiDate(now);
  const existing = await prisma.morningReport.findUnique({
    where: { reportDate_reportType: { reportDate, reportType } },
  });
  const staleMockInLiveMode =
    process.env.DATA_MODE === "live" && existing?.dataMode === "mock";
  if (existing && !options.force && !staleMockInLiveMode)
    return { status: "duplicate" as const, id: existing.id, reportDate };
  const maxRetries = Math.max(
    0,
    Math.min(3, Number(process.env.REPORT_MAX_RETRIES ?? 2)),
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const run = await prisma.jobRun.create({
      data: {
        jobName: REPORT_DEFINITIONS[reportType].jobName,
        reportDate,
        status: "running",
        attempt,
      },
    });
    try {
      const report = await generateReport(reportType, now);
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

export function runMorningReportJob(
  options: { now?: Date; force?: boolean } = {},
) {
  return runReportJob("morning", options);
}
