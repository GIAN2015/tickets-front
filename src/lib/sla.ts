export type SlaPhase = "green" | "yellow" | "red" | "expired" | "unknown";

export function getSlaPhase(params: {
  slaStartAt?: string;
  slaGreenEndAt?: string;
  slaYellowEndAt?: string;
  deadlineAt?: string;
}): SlaPhase {
  const { slaStartAt, slaGreenEndAt, slaYellowEndAt, deadlineAt } = params;
  if (!slaStartAt || !deadlineAt) return "unknown";

  const now = Date.now();
  const greenEnd = slaGreenEndAt ? new Date(slaGreenEndAt).getTime() : NaN;
  const yellowEnd = slaYellowEndAt ? new Date(slaYellowEndAt).getTime() : NaN;
  const deadline = new Date(deadlineAt).getTime();

  if (isNaN(deadline)) return "unknown";
  if (!isNaN(greenEnd) && now <= greenEnd) return "green";
  if (!isNaN(yellowEnd) && now <= yellowEnd) return "yellow";
  if (now <= deadline) return "red";
  return "expired";
}

export function formatRemaining(deadlineAt?: string) {
  if (!deadlineAt) return "";
  const ms = new Date(deadlineAt).getTime() - Date.now();
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  return `${sign}${d}d ${h}h ${m}m`;
}

export function slaProgressPercent(params: {
  slaStartAt?: string;
  deadlineAt?: string;
}) {
  const { slaStartAt, deadlineAt } = params;
  if (!slaStartAt || !deadlineAt) return 0;
  const start = new Date(slaStartAt).getTime();
  const end = new Date(deadlineAt).getTime();
  const now = Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}
