import type { GameEvent } from "../types";

/**
 * Robust CSV State-Machine Parser
 * Parses CSV strings and handles quoted fields with embedded commas, newlines, and escaped quotes ("").
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: "" inside a quoted string -> becomes a single "
        cell += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Cell delimiter
      row.push(cell);
      cell = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Row delimiter (newline outside quotes)
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n of \r\n
      }
      row.push(cell);
      // Only push non-empty rows
      if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
        result.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Handle trailing cell if text didn't end with a newline
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    result.push(row);
  }

  return result;
}

/**
 * Robust CSV Generator
 * Converts GameEvent list back into a standard CSV string.
 * Escapes cells containing quotes, commas, or newlines according to RFC 4180.
 */
export function generateCSV(events: GameEvent[]): string {
  const headers = [
    "ID",
    "Event",
    "Doc",
    "Start in Patch",
    "Date Start",
    "End Date",
    "Loop",
    "Loại Event",
    "Unlock At",
    "Duration",
    "Inteval",
    "Sandb0x Name",
    "Real Name",
    "Remote Config Data",
    "IAPS",
    "Current Season"
  ];

  const escapeCell = (val: any): string => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    // If cell contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = events.map(e => [
    e.id,
    e.name,
    e.doc,
    e.patch,
    e.dateStart,
    e.dateEnd,
    e.loop ? "Yes" : "No",
    e.type,
    e.unlockAt,
    e.durationStr,
    e.intervalStr,
    e.sandboxName,
    e.realName,
    e.remoteConfigStr,
    e.iaps,
    e.currentSeason
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(escapeCell).join(","))
  ].join("\r\n");

  return csvContent;
}

/**
 * Maps rows of string arrays from parsed CSV into GameEvent objects
 */
export function csvRowsToEvents(rows: string[][]): GameEvent[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const events: GameEvent[] = [];

  // Find column indexes
  const idx = {
    id: headers.indexOf("id"),
    name: headers.indexOf("event"),
    doc: headers.indexOf("doc"),
    patch: headers.indexOf("start in patch"),
    dateStart: headers.indexOf("date start"),
    dateEnd: headers.indexOf("end date"),
    loop: headers.indexOf("loop"),
    type: headers.indexOf("loại event"),
    unlockAt: headers.indexOf("unlock at"),
    duration: headers.indexOf("duration"),
    interval: headers.indexOf("inteval"),
    sandbox: headers.indexOf("sandb0x name"),
    realName: headers.indexOf("real name"),
    config: headers.indexOf("remote config data"),
    iaps: headers.indexOf("iaps"),
    season: headers.indexOf("current season")
  };

  // Helper fallback search in case of slightly different names
  const findFallback = (keys: string[]): number => {
    for (const key of keys) {
      const i = headers.findIndex(h => h.includes(key));
      if (i !== -1) return i;
    }
    return -1;
  };

  if (idx.name === -1) idx.name = findFallback(["name", "title"]);
  if (idx.patch === -1) idx.patch = findFallback(["patch", "start in patch"]);
  if (idx.type === -1) idx.type = findFallback(["loại", "type"]);
  if (idx.interval === -1) idx.interval = findFallback(["inteval", "interval"]);
  if (idx.sandbox === -1) idx.sandbox = findFallback(["sandbox", "sandb0x"]);
  if (idx.config === -1) idx.config = findFallback(["config", "remote config", "remote config data"]);

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 0 || (r.length === 1 && r[0] === "")) continue;

    // Extractor with boundary checks
    const getVal = (colIdx: number, fallback = ""): string => {
      if (colIdx === -1 || colIdx >= r.length) return fallback;
      return r[colIdx].trim();
    };

    const idVal = parseInt(getVal(idx.id)) || (events.length + 1);
    const loopVal = getVal(idx.loop).toLowerCase() === "yes" || getVal(idx.loop).toLowerCase() === "true";

    events.push({
      id: idVal,
      name: getVal(idx.name, `Event #${idVal}`),
      doc: getVal(idx.doc),
      patch: getVal(idx.patch, "Patch 3"),
      dateStart: getVal(idx.dateStart),
      dateEnd: getVal(idx.dateEnd),
      loop: loopVal,
      type: getVal(idx.type, "Always"),
      unlockAt: getVal(idx.unlockAt),
      durationStr: getVal(idx.duration),
      intervalStr: getVal(idx.interval),
      sandboxName: getVal(idx.sandbox),
      realName: getVal(idx.realName),
      remoteConfigStr: getVal(idx.config, "{}"),
      iaps: getVal(idx.iaps),
      currentSeason: getVal(idx.season)
    });
  }

  return events;
}
