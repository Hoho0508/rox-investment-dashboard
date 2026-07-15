import type { ResearchStock, StockLibrary } from "@/types/research";

export const STOCK_LIBRARIES: StockLibrary[] = [
  {
    id: "memory",
    name: "記憶體",
    description: "記憶體製造、控制晶片與模組代表公司，供主題研究使用。",
    stocks: [
      ["2408", "南亞科", "TWSE"],
      ["2344", "華邦電", "TWSE"],
      ["2337", "旺宏", "TWSE"],
      ["8299", "群聯", "TPEx"],
      ["3260", "威剛", "TPEx"],
      ["2451", "創見", "TWSE"],
      ["4967", "十銓", "TWSE"],
      ["5351", "鈺創", "TPEx"],
      ["8271", "宇瞻", "TPEx"],
      ["3006", "晶豪科", "TWSE"],
    ].map(toStock),
  },
  {
    id: "ai",
    name: "AI",
    description: "AI 晶片、伺服器、散熱與機殼供應鏈代表公司。",
    stocks: [
      ["2330", "台積電", "TWSE"],
      ["2317", "鴻海", "TWSE"],
      ["2382", "廣達", "TWSE"],
      ["3231", "緯創", "TWSE"],
      ["6669", "緯穎", "TWSE"],
      ["2356", "英業達", "TWSE"],
      ["2376", "技嘉", "TWSE"],
      ["3017", "奇鋐", "TWSE"],
      ["3324", "雙鴻", "TPEx"],
      ["8210", "勤誠", "TWSE"],
    ].map(toStock),
  },
  {
    id: "ic-design",
    name: "IC 晶片",
    description: "IC 設計、高速傳輸與矽智財代表公司。",
    stocks: [
      ["2454", "聯發科", "TWSE"],
      ["3034", "聯詠", "TWSE"],
      ["2379", "瑞昱", "TWSE"],
      ["3443", "創意", "TWSE"],
      ["3661", "世芯-KY", "TWSE"],
      ["5269", "祥碩", "TWSE"],
      ["4966", "譜瑞-KY", "TWSE"],
      ["6531", "愛普*", "TWSE"],
      ["3227", "原相", "TPEx"],
      ["6415", "矽力*-KY", "TWSE"],
    ].map(toStock),
  },
  {
    id: "weighted",
    name: "權值股",
    description: "跨科技、金融與電信的大型代表公司；不是即時市值排名。",
    stocks: [
      ["2330", "台積電", "TWSE"],
      ["2317", "鴻海", "TWSE"],
      ["2454", "聯發科", "TWSE"],
      ["2308", "台達電", "TWSE"],
      ["2382", "廣達", "TWSE"],
      ["3711", "日月光投控", "TWSE"],
      ["2881", "富邦金", "TWSE"],
      ["2882", "國泰金", "TWSE"],
      ["2891", "中信金", "TWSE"],
      ["2412", "中華電", "TWSE"],
    ].map(toStock),
  },
];

function toStock(tuple: string[]): ResearchStock {
  return {
    symbol: tuple[0],
    name: tuple[1],
    exchange: tuple[2] as ResearchStock["exchange"],
  };
}

const trustedStocks = new Map(
  STOCK_LIBRARIES.flatMap((library) => library.stocks).map((stock) => [
    stock.symbol,
    stock,
  ]),
);

export function resolveLibraryStocks(symbols: string[]) {
  return [...new Set(symbols)]
    .map((symbol) => trustedStocks.get(symbol))
    .filter((stock): stock is ResearchStock => Boolean(stock));
}
