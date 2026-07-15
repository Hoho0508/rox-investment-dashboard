import { ResearchCenter } from "@/components/research-center";
import { formatInTimeZone } from "date-fns-tz";
import { getUpcomingInvestorConferences } from "@/lib/events/mops";
import { getWatchlist } from "@/lib/market/watchlist";
import { latestOrPreview } from "@/lib/reports/view";
import {
  BEGINNER_GLOSSARY,
  buildBeginnerDecision,
} from "@/lib/research/beginner";
import { STOCK_LIBRARIES } from "@/lib/research/stock-library";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const [events, report, watchlist] = await Promise.all([
    getUpcomingInvestorConferences(),
    latestOrPreview(),
    getWatchlist(),
  ]);
  const eventMap = new Map(events.value?.map((event) => [event.symbol, event]));
  const decisions = report.stocks.map((stock) =>
    buildBeginnerDecision(stock, eventMap.get(stock.symbol)),
  );

  return (
    <ResearchCenter
      events={events}
      decisions={decisions}
      libraries={STOCK_LIBRARIES}
      glossary={BEGINNER_GLOSSARY}
      initialSavedSymbols={watchlist.map((item) => item.symbol)}
      eventsFetchedAtLabel={formatInTimeZone(
        new Date(events.fetchedAt),
        "Asia/Taipei",
        "yyyy-MM-dd HH:mm:ss",
      )}
    />
  );
}
