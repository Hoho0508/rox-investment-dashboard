import { runMorningReportJob } from "../src/lib/reports/store";

runMorningReportJob()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "晨報產生失敗");
    process.exitCode = 1;
  });
