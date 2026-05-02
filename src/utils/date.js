import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(customParseFormat);
dayjs.extend(utc);

const MFAPI_DATE_FORMAT = "DD-MM-YYYY";

export function parseMfapiDate(value) {
  return dayjs.utc(value, MFAPI_DATE_FORMAT, true);
}

export function toDateOnly(dayjsDate) {
  return dayjsDate.startOf("day").toDate();
}

export function dateToIso(date) {
  return dayjs.utc(date).format("YYYY-MM-DD");
}

export function daysBetween(start, end) {
  return dayjs.utc(end).diff(dayjs.utc(start), "day");
}
