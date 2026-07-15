import { parseReportType } from "../src/lib/reports/config";
import { runReportJob } from "../src/lib/reports/store";

const reportType = parseReportType(process.argv[2]);

runReportJob(reportType)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "晨報產生失敗");
    process.exitCode = 1;
  });
