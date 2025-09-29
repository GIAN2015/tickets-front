export const FILES_BASE =
  process.env.NEXT_PUBLIC_FILES_BASE_URL?.replace(/\/+$/, "") || "";

export function fileUrl(fileName: string) {
  return `${FILES_BASE}/tickets/${encodeURIComponent(fileName)}`;
}
