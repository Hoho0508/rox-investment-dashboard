export const ENTRY_WEIGHTS = {
  fundamentals: 35,
  valuation: 25,
  marketIndustry: 15,
  technicalPosition: 10,
  thesisCompleteness: 5,
  riskManagement: 10,
} as const;

export const ENTRY_BANDS = [
  { min: 80, label: "符合多數條件，可列入分批布局觀察" },
  { min: 65, label: "部分條件成立，持續等待確認" },
  { min: 50, label: "吸引力普通或資料不足" },
  { min: 0, label: "目前不符合進場紀律" },
] as const;

export const EXIT_BANDS = [
  { min: 80, label: "基本面或風險明顯惡化，需要完整複核" },
  { min: 60, label: "需要重新檢查投資論點" },
  { min: 40, label: "需要觀察" },
  { min: 0, label: "投資理由暫時穩定" },
] as const;
