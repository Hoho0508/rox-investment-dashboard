import { generateMorningReport } from "@/lib/reports/generate";
import { getLatestReport } from "@/lib/reports/store";

export async function latestOrPreview() {
  try {
    return (await getLatestReport()) ?? (await generateMorningReport());
  } catch {
    return generateMorningReport();
  }
}
