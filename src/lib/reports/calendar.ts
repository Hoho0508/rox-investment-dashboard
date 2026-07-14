import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { REPORT_TIME_ZONE } from "@/lib/config/market-scenarios";

export const taipeiDate = (date = new Date()) =>
  formatInTimeZone(date, REPORT_TIME_ZONE, "yyyy-MM-dd");
export const taipeiDateTime = (date = new Date()) =>
  formatInTimeZone(date, REPORT_TIME_ZONE, "yyyy-MM-dd HH:mm:ss xxx");

export function isTaiwanTradingDay(date = new Date()) {
  const day = Number(formatInTimeZone(date, REPORT_TIME_ZONE, "i"));
  return day <= 5;
}

export function taipeiStartOfDayUtc(date = new Date()) {
  return fromZonedTime(`${taipeiDate(date)} 00:00:00`, REPORT_TIME_ZONE);
}
