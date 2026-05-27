import type { GameEvent, LoopConfig, ManualConfig, ScheduledOccurrence } from "../types";

/**
 * Parses custom game date number format YYYYMMDDhhmmss to JS Date
 * Example: 20260112000001 -> Mon Jan 12 2026 00:00:01 GMT
 */
export function parseGameDate(num: number | string | undefined | null): Date {
  if (!num) return new Date();
  const str = String(num).trim();
  if (str.length < 8) return new Date();

  const year = parseInt(str.slice(0, 4)) || 2026;
  const month = (parseInt(str.slice(4, 6)) || 1) - 1; // 0-indexed in JS
  const day = parseInt(str.slice(6, 8)) || 1;
  const hour = parseInt(str.slice(8, 10)) || 0;
  const minute = parseInt(str.slice(10, 12)) || 0;
  const second = parseInt(str.slice(12, 14)) || 0;

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Serializes JS Date to game date number format YYYYMMDDhhmmss
 */
export function formatGameDate(date: Date): number {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  
  return parseInt(`${year}${month}${day}${hour}${minute}${second}`);
}

/**
 * Formats a Date object to a friendly readable string
 */
export function toFriendlyString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const day = pad(date.getDate());
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${day} ${month} ${year} ${hour}:${minute}:${second}`;
}

/**
 * Formats seconds into human readable duration (e.g., "14d 0h", "3d 15h", "2h 30m")
 */
export function formatSecondsToDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 && parts.length === 0) parts.push(`${s}s`);

  return parts.slice(0, 2).join(" ") || "0s";
}

/**
 * Generates all occurrences of a game event between startDate and endDate
 */
export function getEventActiveWindows(
  event: GameEvent,
  limitStart: Date = new Date("2025-12-01T00:00:00"),
  limitEnd: Date = new Date("2026-12-31T23:59:59")
): ScheduledOccurrence[] {
  const occurrences: ScheduledOccurrence[] = [];

  if (!event.remoteConfigStr) return occurrences;

  let config: any;
  try {
    config = JSON.parse(event.remoteConfigStr);
  } catch (e) {
    // Return empty if invalid config JSON
    return occurrences;
  }

  // Handle Manual Event Setup
  if (config.manualSeason && Array.isArray(config.manualSeason)) {
    const manualConfig = config as ManualConfig;
    for (const ms of manualConfig.manualSeason) {
      const start = parseGameDate(ms.timeStart);
      const end = parseGameDate(ms.timeEnd);

      // Check if within limit window
      if (end >= limitStart && start <= limitEnd) {
        occurrences.push({
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          season: ms.season,
          dataId: ms.dataId,
          timeStart: start,
          timeEnd: end,
          lockedDuration: ms.lockedDuration,
        });
      }
    }
    return occurrences;
  }

  // Handle Loop Event Setup
  if (config.rule) {
    const loopConfig = config as LoopConfig;
    const rule = loopConfig.rule;

    // 1. Process Override Season if it exists and is within limits
    if (loopConfig.overrideSeason) {
      const override = loopConfig.overrideSeason;
      const oStart = parseGameDate(override.timeStart);
      const oEnd = parseGameDate(override.timeEnd);

      if (oEnd >= limitStart && oStart <= limitEnd) {
        occurrences.push({
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          season: override.season,
          dataId: override.dataId,
          timeStart: oStart,
          timeEnd: oEnd,
          isOverride: true,
        });
      }
    }

    // 2. Generate recurrent loop cycles
    const loopStart = parseGameDate(rule.timeStart);
    let currentStart = new Date(loopStart.getTime());
    let index = 0;
    
    // Safety cap to prevent infinite loops (max 100 seasons generated per event)
    while (currentStart.getTime() <= limitEnd.getTime() && index < 100) {
      const durationSeconds = rule.duration;
      const currentEnd = new Date(currentStart.getTime() + durationSeconds * 1000);
      
      const season = rule.seasonStart + index;
      const dataId = rule.dataIds[index % rule.dataIds.length];

      // Add to occurrences if it overlaps with our limits
      if (currentEnd >= limitStart && currentStart <= limitEnd) {
        occurrences.push({
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          season: season,
          dataId: dataId,
          timeStart: new Date(currentStart.getTime()),
          timeEnd: currentEnd,
          duration: durationSeconds,
        });
      }

      // Calculate next loop starting point
      const intervalIndex = index % rule.intervals.length;
      const intervalSeconds = rule.intervals[intervalIndex];
      
      // The start time of the next loop is currentEnd + intervalSeconds
      currentStart = new Date(currentEnd.getTime() + intervalSeconds * 1000);
      index++;
    }
  }

  return occurrences;
}
