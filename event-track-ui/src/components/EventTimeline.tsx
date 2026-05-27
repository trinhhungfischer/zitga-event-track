import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Info, AlertCircle } from "lucide-react";
import type { GameEvent, ScheduledOccurrence } from "../types";
import { getEventActiveWindows, toFriendlyString, formatSecondsToDuration } from "../utils/dateUtils";

interface EventTimelineProps {
  events: GameEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const defaultDate = useMemo(() => {
    const d = new Date();
    if (d.getFullYear() < 2025) d.setFullYear(2025);
    if (d.getFullYear() > 2030) d.setFullYear(2030);
    return d;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(defaultDate.getMonth()); // Default to current month
  const [selectedYear, setSelectedYear] = useState(defaultDate.getFullYear()); // Default to current year

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // 1. Calculate boundaries of selected month
  const monthStart = useMemo(() => new Date(selectedYear, selectedMonth, 1, 0, 0, 0), [selectedMonth, selectedYear]);
  const monthEnd = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59), [selectedMonth, selectedYear]);
  const daysInMonth = useMemo(() => monthEnd.getDate(), [monthEnd]);

  // 2. Generate occurrences for all events inside this month window
  const eventOccurrencesMap = useMemo(() => {
    const map: { [eventId: number]: ScheduledOccurrence[] } = {};
    for (const event of events) {
      // Calculate schedule with padding to ensure overlaps at boundaries show up
      const padStart = new Date(selectedYear, selectedMonth - 1, 15);
      const padEnd = new Date(selectedYear, selectedMonth + 1, 15);
      const occurrences = getEventActiveWindows(event, padStart, padEnd);
      
      // Filter occurrences that overlap with current month
      map[event.id] = occurrences.filter(occ => {
        return occ.timeEnd >= monthStart && occ.timeStart <= monthEnd;
      });
    }
    return map;
  }, [events, selectedMonth, selectedYear, monthStart, monthEnd]);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1));
  };

// Beautiful rotating fallback color configurations for custom event types
const customColors = [
  { bg: "bg-cyan-600/80 border-cyan-500 hover:bg-cyan-600", text: "text-cyan-200", glow: "shadow-cyan-600/10", badge: "bg-cyan-500/20 text-cyan-400" },
  { bg: "bg-fuchsia-600/80 border-fuchsia-500 hover:bg-fuchsia-600", text: "text-fuchsia-200", glow: "shadow-fuchsia-600/10", badge: "bg-fuchsia-500/20 text-fuchsia-400" },
  { bg: "bg-pink-600/80 border-pink-500 hover:bg-pink-600", text: "text-pink-200", glow: "shadow-pink-600/10", badge: "bg-pink-500/20 text-pink-400" },
  { bg: "bg-orange-600/80 border-orange-500 hover:bg-orange-600", text: "text-orange-200", glow: "shadow-orange-600/10", badge: "bg-orange-500/20 text-orange-400" },
  { bg: "bg-teal-600/80 border-teal-500 hover:bg-teal-600", text: "text-teal-200", glow: "shadow-teal-600/10", badge: "bg-teal-500/20 text-teal-400" },
];

const getCustomColorSet = (type: string) => {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % customColors.length;
  return customColors[idx];
};

  // Helper to resolve event category color classes
  const getCategoryStyles = (type: string) => {
    switch (type) {
      case "Always":
        return {
          bg: "bg-violet-600/80 border-violet-500 hover:bg-violet-600",
          text: "text-violet-200",
          glow: "shadow-violet-600/10",
          badge: "bg-violet-500/20 text-violet-400"
        };
      case "Growth":
        return {
          bg: "bg-blue-600/80 border-blue-500 hover:bg-blue-600",
          text: "text-blue-200",
          glow: "shadow-blue-600/10",
          badge: "bg-blue-500/20 text-blue-400"
        };
      case "Weekend":
        return {
          bg: "bg-amber-600/80 border-amber-500 hover:bg-amber-600",
          text: "text-amber-200",
          glow: "shadow-amber-600/10",
          badge: "bg-amber-500/20 text-amber-400"
        };
      case "Hero Exclusive":
        return {
          bg: "bg-emerald-600/80 border-emerald-500 hover:bg-emerald-600",
          text: "text-emerald-200",
          glow: "shadow-emerald-600/10",
          badge: "bg-emerald-500/20 text-emerald-400"
        };
      case "New Minigame":
        return {
          bg: "bg-rose-600/80 border-rose-500 hover:bg-rose-600",
          text: "text-rose-200",
          glow: "shadow-rose-600/10",
          badge: "bg-rose-500/20 text-rose-400"
        };
      default:
        return getCustomColorSet(type);
    }
  };

  // Helper to determine day columns width inside table header
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
      
      {/* Header and Month Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display text-white">Event Timeline Calendar</h2>
            <div className="flex bg-slate-900 border border-white/5 rounded-lg px-2.5 py-0.5 text-xs font-semibold text-slate-400 items-center gap-1.5 font-mono-custom">
              <Calendar size={12} />
              <span>{selectedYear}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Interactive Gantt-style schedule visualizer for planning live ops</p>
        </div>

        {/* Month & Year Selector */}
        <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 shadow-inner gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="w-24 text-center text-sm font-semibold text-white font-display">
            {months[selectedMonth]}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          <div className="h-6 w-[1px] bg-white/10 mx-1" />

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-transparent border-0 text-sm font-semibold text-white focus:outline-none pr-1.5 cursor-pointer font-mono-custom font-bold"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y} className="bg-slate-900 text-white font-semibold">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gantt Timeline visualization */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-slate-950/20">
        <div className="min-w-[980px] divide-y divide-white/5">
          
          {/* Calendar Header Day markers */}
          <div className="flex items-stretch bg-slate-900/60 font-mono-custom text-[10px] font-semibold text-slate-400 h-10">
            <div className="w-56 px-4 flex items-center shrink-0 border-r border-white/10 text-slate-300 font-display text-xs">
              Event Module
            </div>
            <div className="flex-1 grid grid-cols-12 relative">
              {daysArray.map((day) => {
                const dayDate = new Date(selectedYear, selectedMonth, day);
                const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                return (
                  <div
                    key={day}
                    style={{
                      gridColumn: `span 1`,
                      width: `${100 / daysInMonth}%`,
                      position: "absolute",
                      left: `${((day - 1) / daysInMonth) * 100}%`,
                      height: "100%"
                    }}
                    className={`flex flex-col items-center justify-center border-r border-white/5 h-full ${
                      isWeekend ? "bg-white/[0.015]" : ""
                    }`}
                  >
                    <span>{day}</span>
                    <span className="text-[8px] text-slate-500 uppercase">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dayDate.getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Gantt Tracks */}
          {events.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No events to display in the calendar. Add an event to see it mapped out.
            </div>
          ) : (
            events.map((event, eventIdx) => {
              const occurrences = eventOccurrencesMap[event.id] || [];
              const colors = getCategoryStyles(event.type);

              return (
                <div key={event.id} className="flex items-stretch min-h-[52px] group hover:bg-white/[0.01] transition-colors relative hover:z-30">
                  {/* Event labels column */}
                  <div className="w-56 px-4 py-2 border-r border-white/10 flex flex-col justify-center shrink-0">
                    <span className="text-xs font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                      {event.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${colors.badge}`}>
                        {event.type}
                      </span>
                      <span className="text-[9px] text-slate-500 truncate font-mono-custom">
                        {event.patch}
                      </span>
                    </div>
                  </div>

                  {/* Visual Timeline Gantt Area */}
                  <div className="flex-1 relative min-h-[52px]">
                    
                    {/* Vertical grid lines helper */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {daysArray.map((day) => {
                        const dayDate = new Date(selectedYear, selectedMonth, day);
                        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                        return (
                          <div
                            key={day}
                            style={{
                              left: `${((day - 1) / daysInMonth) * 100}%`,
                              width: `${100 / daysInMonth}%`
                            }}
                            className={`absolute h-full border-r border-white/5 ${
                              isWeekend ? "bg-white/[0.015]" : ""
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Active capsule blocks */}
                    {occurrences.map((occ, oIdx) => {
                      // Calculate coordinates in percentage inside the month
                      const tStart = occ.timeStart.getTime();
                      const tEnd = occ.timeEnd.getTime();
                      const limitStart = monthStart.getTime();
                      const limitEnd = monthEnd.getTime();

                      const clampStart = Math.max(tStart, limitStart);
                      const clampEnd = Math.min(tEnd, limitEnd);
                      
                      const monthDuration = limitEnd - limitStart;
                      const offsetPercent = ((clampStart - limitStart) / monthDuration) * 100;
                      const widthPercent = ((clampEnd - clampStart) / monthDuration) * 100;

                      return (
                        <div
                          key={oIdx}
                          style={{
                            left: `${offsetPercent}%`,
                            width: `${Math.max(widthPercent, 1.2)}%`, // Minimum width to show tiny runs
                          }}
                          className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg border flex items-center justify-center font-mono-custom text-[10px] font-bold select-none cursor-pointer transition-all shadow-md group/capsule z-10 ${
                            colors.bg
                          } ${colors.text} ${colors.glow}`}
                        >
                          {/* Season Index Tag */}
                          <span className="px-1 truncate">
                            S{occ.season}
                          </span>

                          {/* Complex Hover Tooltip details card */}
                          <div className={`invisible group-hover/capsule:visible absolute left-1/2 -translate-x-1/2 w-72 glass-panel p-4 rounded-xl border border-white/15 text-slate-300 font-normal text-[11px] shadow-2xl space-y-2 z-50 animate-float pointer-events-none ${
                            eventIdx < 3 ? "top-full mt-2" : "bottom-full mb-2"
                          }`}>
                            <div className="flex items-center justify-between border-b border-white/5 pb-1">
                              <span className="font-semibold text-white truncate max-w-[160px] text-xs">
                                {event.name}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${colors.badge}`}>
                                Season {occ.season}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                              <div>
                                <span className="text-slate-500">Starts:</span>
                                <div className="text-slate-300 font-mono-custom font-semibold">
                                  {toFriendlyString(occ.timeStart)}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500">Ends:</span>
                                <div className="text-slate-300 font-mono-custom font-semibold">
                                  {toFriendlyString(occ.timeEnd)}
                                </div>
                              </div>
                              <div className="border-t border-white/5 pt-1">
                                <span className="text-slate-500">Duration:</span>
                                <div className="text-indigo-400 font-semibold">
                                  {occ.duration ? formatSecondsToDuration(occ.duration) : event.durationStr}
                                </div>
                              </div>
                              <div className="border-t border-white/5 pt-1">
                                <span className="text-slate-500">Content Data ID:</span>
                                <div className="text-emerald-400 font-semibold font-mono-custom">
                                  dataId: {occ.dataId}
                                </div>
                              </div>
                            </div>

                            {/* Alert indicators for override seasons or locked states */}
                            {occ.isOverride && (
                              <div className="flex items-center gap-1.5 p-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/15 text-[9px] font-semibold">
                                <AlertCircle size={10} />
                                <span>Running as Manual Override Season</span>
                              </div>
                            )}

                            {occ.lockedDuration && (
                              <div className="flex items-center gap-1.5 p-1 bg-rose-500/10 text-rose-400 rounded border border-rose-500/15 text-[9px] font-semibold">
                                <Info size={10} />
                                <span>Locked Duration: {formatSecondsToDuration(occ.lockedDuration)}</span>
                              </div>
                            )}

                            {/* PDF References */}
                            <div className="text-[10px] text-slate-500 border-t border-white/5 pt-1.5 flex items-center justify-between">
                              <span>Chapter Unlock: {event.unlockAt || "N/A"}</span>
                              <span>Real: {event.realName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              );
            })
          )}

        </div>
      </div>

      {/* Visual Legend */}
      <div className="flex flex-wrap gap-4 items-center justify-between text-xs border-t border-white/5 pt-4 bg-slate-900/10 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-medium">Event Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-600 border border-violet-500 shadow-md shadow-violet-500/10" />
            <span className="text-slate-300">Always Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 border border-blue-500 shadow-md shadow-blue-500/10" />
            <span className="text-slate-300">Growth Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600 border border-amber-500 shadow-md shadow-amber-500/10" />
            <span className="text-slate-300">Weekend Special</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500 shadow-md shadow-emerald-500/10" />
            <span className="text-slate-300">Hero Exclusive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600 border border-rose-500 shadow-md shadow-rose-500/10" />
            <span className="text-slate-300">Seasonal Minigame</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Info size={12} className="text-slate-400" />
          <span>Hover timeline season blocks to view detail inspect cards</span>
        </div>
      </div>

    </div>
  );
};
