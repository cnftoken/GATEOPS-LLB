// Time, duration, and number formatting per PRD 4.7. Single source for UI.
// Timestamps are stored/handled as UTC; display uses the device timezone.

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

/** Format a date as `25 November 2026, 17:40` in the device timezone. PRD 4.7.3 */
export function formatDateTime(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_ID[date.getMonth()];
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/** Format a duration in seconds as `X jam Y menit` or `Y menit`, floored to minutes. PRD 4.7.4 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) {
    return `${hours} jam ${minutes} menit`;
  }
  return `${minutes} menit`;
}

/** Format an integer with `.` thousands separators, e.g. `1.250`. PRD 4.7.5 */
export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
