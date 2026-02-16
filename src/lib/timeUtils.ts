/**
 * Shared Time Utilities
 *
 * Parsing, formatting, and clamping for rest timer values.
 * Used by both RestTimerInline (template editor) and RestTimerBar (active workout).
 *
 * - formatTime: seconds -> "M:SS" display string
 * - parseTimeInput: user input string -> seconds (or null for unparseable)
 * - clampSeconds: bounds enforcement
 */

/**
 * Format seconds to M:SS display string.
 * Clamps input to minimum 0 before formatting.
 *
 * Examples: 90 -> "1:30", 60 -> "1:00", 45 -> "0:45", 0 -> "0:00"
 */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse user input to seconds.
 * Handles plain seconds ("90") or M:SS format ("1:30").
 *
 * Returns null for unparseable input (empty string, whitespace-only, non-numeric).
 * Returns the parsed number for valid input (including 0).
 * The caller is responsible for clamping to bounds.
 *
 * Examples:
 *   "90"   -> 90
 *   "1:30" -> 90
 *   ":30"  -> 30
 *   "1:"   -> 60
 *   "0"    -> 0
 *   ""     -> null
 *   "abc"  -> null
 *   " "    -> null
 */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  // Check for M:SS or MM:SS format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const minsRaw = parseInt(parts[0], 10);
    const secsRaw = parseInt(parts[1], 10);

    // If BOTH parts are NaN, input is unparseable (e.g., "abc:def")
    if (isNaN(minsRaw) && isNaN(secsRaw)) return null;

    const mins = isNaN(minsRaw) ? 0 : minsRaw;
    const secs = isNaN(secsRaw) ? 0 : secsRaw;
    const result = mins * 60 + secs;

    return result < 0 ? null : result;
  }

  // Plain number -- treat as seconds
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed)) return null;
  if (parsed < 0) return null;
  return parsed;
}

/**
 * Clamp seconds to bounds.
 * Returns Math.max(min, Math.min(max, seconds)).
 */
export function clampSeconds(seconds: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, seconds));
}
