// src/utils/date.ts
export const APP_TZ = "America/Lima"; // cambia si necesitas otra TZ
export const APP_LOCALE = "es-PE";
//(hola)
export function fmtDateTime(input: string | number | Date) {
  const d = new Date(input);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
    timeZone: APP_TZ,
  }).format(d);
}

export function fmtDate(input: string | number | Date) {
  const d = new Date(input);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "medium",
    timeZone: APP_TZ,
  }).format(d);
}

export function fmtTime(input: string | number | Date) {
  const d = new Date(input);
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeStyle: "short",
    hour12: true,
    timeZone: APP_TZ,
  }).format(d);
}
