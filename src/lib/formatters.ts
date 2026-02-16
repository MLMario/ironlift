/**
 * Formatting Utilities
 *
 * Shared formatting functions for volume, dates, and display values.
 * Ported from web app (exercise_tracker_app) formatting patterns.
 */

/**
 * Format a volume number into a compact display string.
 * Examples: 45200 -> "45.2k", 1000 -> "1k", 750 -> "750"
 *
 * @param n - Raw volume number
 * @returns Formatted string
 */
export function formatVolume(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? k + 'k' : k.toFixed(1) + 'k';
  }
  return n.toLocaleString();
}

/**
 * Format an ISO date string to short display format.
 * Example: "2026-02-05T10:30:00Z" -> "Feb 5"
 *
 * @param isoString - ISO date string
 * @returns Short formatted date
 */
export function formatWorkoutDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format an ISO date string to detail display format with year.
 * Example: "2026-02-05T10:30:00Z" -> "Feb 5, 2026"
 *
 * @param isoString - ISO date string
 * @returns Formatted date with year
 */
export function formatDetailDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
