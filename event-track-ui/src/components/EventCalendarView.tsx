import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Layers, Clock } from "lucide-react";
import type { GameEvent, ScheduledOccurrence } from "../types";
import { getEventActiveWindows, toFriendlyString } from "../utils/dateUtils";

interface EventCalendarViewProps {
  events: GameEvent[];
  isAdmin: boolean;
  onEditEvent: (event: GameEvent) => void;
}

export const EventCalendarView: React.FC<EventCalendarViewProps> = ({ events, isAdmin, onEditEvent }) => {
  const defaultDate = useMemo(() => {
    const d = new Date();
    if (d.getFullYear() < 2025) d.setFullYear(2025);
    if (d.getFullYear() > 2030) d.setFullYear(2030);
    return d;
  }, []);

  const [selectedYear, setSelectedYear] = useState(defaultDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(defaultDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(defaultDate.getDate());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // 1. Calculate boundaries of selected month
  const monthStart = useMemo(() => new Date(selectedYear, selectedMonth, 1, 0, 0, 0), [selectedMonth, selectedYear]);
  const monthEnd = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59), [selectedMonth, selectedYear]);
  const daysInMonth = useMemo(() => monthEnd.getDate(), [monthEnd]);
  
  // Index of the first day of the month (0 = Sun, 1 = Mon, etc.)
  const firstDayIndex = useMemo(() => monthStart.getDay(), [monthStart]);

  // 2. Generate all occurrences for the month (with padding to cover boundaries)
  const allMonthOccurrences = useMemo(() => {
    const list: ScheduledOccurrence[] = [];
    const padStart = new Date(selectedYear, selectedMonth - 1, 15);
    const padEnd = new Date(selectedYear, selectedMonth + 1, 15);

    for (const event of events) {
      const occurrences = getEventActiveWindows(event, padStart, padEnd);
      list.push(...occurrences);
    }
    return list;
  }, [events, selectedMonth, selectedYear]);

  // 3. Map events running on each day of the month
  const dayEventsMap = useMemo(() => {
    const map: { [day: number]: ScheduledOccurrence[] } = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      // Midnight and midday reference points for the day to check overlaps
      const dayMiddle = new Date(selectedYear, selectedMonth, day, 12, 0, 0);
      
      map[day] = allMonthOccurrences.filter(occ => {
        return occ.timeStart <= dayMiddle && occ.timeEnd >= dayMiddle;
      });
    }
    return map;
  }, [allMonthOccurrences, daysInMonth, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 0) {
        if (selectedYear > 2025) {
          setSelectedYear(selectedYear - 1);
          return 11;
        }
        return 0;
      }
      return prev - 1;
    });
    setSelectedDay(1); // Reset selected day to 1st on month change
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 11) {
        if (selectedYear < 2030) {
          setSelectedYear(selectedYear + 1);
          return 0;
        }
        return 11;
      }
      return prev + 1;
    });
    setSelectedDay(1);
  };

  // 4. Events active on the currently selected day
  const selectedDateEvents = useMemo(() => {
    return dayEventsMap[selectedDay] || [];
  }, [dayEventsMap, selectedDay]);



// Beautiful rotating fallback color configurations for custom event types
const customColors = [
  { border: "border-cyan-500/20 hover:border-cyan-500/40", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", tag: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300" },
  { border: "border-fuchsia-500/20 hover:border-fuchsia-500/40", badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20", tag: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300" },
  { border: "border-pink-500/20 hover:border-pink-500/40", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20", tag: "bg-pink-500/10 border-pink-500/20 text-pink-300" },
  { border: "border-orange-500/20 hover:border-orange-500/40", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", tag: "bg-orange-500/10 border-orange-500/20 text-orange-300" },
  { border: "border-teal-500/20 hover:border-teal-500/40", badge: "bg-teal-500/10 text-teal-400 border-teal-500/20", tag: "bg-teal-500/10 border-teal-500/20 text-teal-300" },
];

const getCustomColorSet = (type: string) => {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % customColors.length;
  return customColors[idx];
};

  // Helper to resolve card border based on category
  const getCategoryBorderClass = (type: string) => {
    switch (type) {
      case "Always": return "border-violet-500/20 hover:border-violet-500/40";
      case "Growth": return "border-blue-500/20 hover:border-blue-500/40";
      case "Weekend": return "border-amber-500/20 hover:border-amber-500/40";
      case "Hero Exclusive": return "border-emerald-500/20 hover:border-emerald-500/40";
      case "New Minigame": return "border-rose-500/20 hover:border-rose-500/40";
      default: return getCustomColorSet(type).border;
    }
  };

  const getCategoryBadgeClass = (type: string) => {
    switch (type) {
      case "Always": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      case "Growth": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Weekend": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Hero Exclusive": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "New Minigame": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default: return getCustomColorSet(type).badge;
    }
  };

  const getCategoryCompactTagClass = (type: string) => {
    switch (type) {
      case "Always": return "bg-violet-500/10 border-violet-500/20 text-violet-300";
      case "Growth": return "bg-blue-500/10 border-blue-500/20 text-blue-300";
      case "Weekend": return "bg-amber-500/10 border-amber-500/20 text-amber-300";
      case "Hero Exclusive": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
      case "New Minigame": return "bg-rose-500/10 border-rose-500/20 text-rose-300";
      default: return getCustomColorSet(type).tag;
    }
  };

  // Construct grid array
  const gridCells = useMemo(() => {
    const cells = [];
    // Pad empty cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, events: [] });
    }
    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        events: dayEventsMap[day] || []
      });
    }
    return cells;
  }, [firstDayIndex, daysInMonth, dayEventsMap]);

  return (
    <div className="space-y-6">
      
      {/* Calendar Controller & Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Calendar Month Grid */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display text-white">Monthly Grid Planner</h3>
                <div className="flex bg-slate-900 border border-white/5 rounded-lg px-2 py-0.5 text-[10px] font-mono-custom text-slate-400 items-center gap-1">
                  <Calendar size={10} />
                  <span>{selectedYear}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">Click a day cell to list all running event modules below</p>
            </div>

            {/* Month & Year Toggles */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-0.5 shadow-inner gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              
              <span className="w-20 text-center text-xs font-semibold text-white font-display">
                {months[selectedMonth]}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>

              <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value));
                  setSelectedDay(1); // Reset day
                }}
                className="bg-transparent border-0 text-xs font-semibold text-white focus:outline-none pr-1.5 cursor-pointer font-mono-custom font-bold"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white font-semibold">{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Traditional Month Grid layout */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/20">
            {/* Weekdays row */}
            <div className="grid grid-cols-7 bg-slate-900/60 font-display text-xs font-semibold text-slate-400 text-center py-2 border-b border-white/5">
              {weekdays.map(wd => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 auto-rows-[120px]">
              {gridCells.map((cell, idx) => {
                const isSelected = cell.day === selectedDay;
                const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                
                if (cell.day === null) {
                  return (
                    <div 
                      key={`empty-${idx}`} 
                      className={`border-r border-b border-white/5 bg-slate-950/10 ${
                        isWeekend ? "bg-white/[0.005]" : ""
                      }`} 
                    />
                  );
                }



                return (
                  <button
                    key={`day-${cell.day}`}
                    onClick={() => setSelectedDay(cell.day!)}
                    className={`border-r border-b border-white/5 flex flex-col justify-start items-stretch p-2 text-left relative focus:outline-none transition-all group ${
                      isSelected 
                        ? "bg-violet-600/20 border-violet-500/50" 
                        : "hover:bg-white/[0.015]"
                    } ${isWeekend ? "bg-white/[0.005]" : ""}`}
                  >
                    {/* Day number */}
                    <span className={`text-[11px] font-bold ${
                      isSelected 
                        ? "text-violet-400 font-extrabold" 
                        : "text-slate-300 group-hover:text-white"
                    }`}>
                      {cell.day}
                    </span>

                    {/* Compact Event Name Tag Capsules */}
                    {cell.events.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1.5 w-full overflow-hidden">
                        {cell.events.slice(0, 4).map((occ, oIdx) => {
                          const catColors = getCategoryCompactTagClass(occ.eventType);
                          return (
                            <div
                              key={oIdx}
                              className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-semibold border ${catColors}`}
                              title={`${occ.eventName} (Season ${occ.season})`}
                            >
                              S{occ.season}: {occ.eventName}
                            </div>
                          );
                        })}
                        {cell.events.length > 4 && (
                          <div className="text-[9px] text-slate-500 font-semibold pl-1 font-mono-custom leading-none mt-0.5">
                            + {cell.events.length - 4} more
                          </div>
                        )}
                      </div>
                    )}

                    {/* Badge counts indicator if lots of events */}
                    {cell.events.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold font-mono-custom text-slate-500 px-1 rounded-md bg-slate-900 border border-white/5">
                        {cell.events.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Legend & Selected Day Stats summary */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h4 className="text-xs font-display text-indigo-400 uppercase tracking-wider">Calendar Legend</h4>
            
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span>Always Event</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Growth Event</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Weekend Event</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Hero Exclusive</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Seasonal Minigame</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <h4 className="text-xs font-display text-indigo-400 uppercase tracking-wider">Day Overview</h4>
            
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Selected Date:</span>
                <span className="font-bold text-white font-mono-custom">
                  {selectedDay} {months[selectedMonth]} {selectedYear}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-400">Running Modules:</span>
                <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded text-xs font-bold font-mono-custom">
                  {selectedDateEvents.length} active
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Selecting a cell highlights the date, allowing you to instantly view and edit configurations running on that calendar frame below.
            </p>
          </div>
        </div>

      </div>

      {/* Events Active Section below */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-md font-display text-white flex items-center gap-2">
            <Layers size={18} className="text-violet-400" />
            <span>Active Events on {selectedDay} {months[selectedMonth]} {selectedYear}</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono-custom">
            Count: {selectedDateEvents.length}
          </span>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="glass-panel py-12 text-center text-slate-500 rounded-2xl border border-white/5 text-xs">
            No events scheduled to run on this specific date.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDateEvents.map((occ, idx) => {
              // Find full event template to retrieve Doc, unlockAt, realName
              const parentEvent = events.find(e => e.id === occ.eventId);
              const borderColors = getCategoryBorderClass(occ.eventType);
              const badgeColors = getCategoryBadgeClass(occ.eventType);

              return (
                <div
                  key={`${occ.eventId}-${idx}`}
                  className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-300 ${borderColors}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 max-w-[70%]">
                        <h4 className="text-sm font-semibold text-white truncate">{occ.eventName}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase ${badgeColors}`}>
                            {occ.eventType}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono-custom">
                            S{occ.season} / dataId: {occ.dataId}
                          </span>
                        </div>
                      </div>

                      {/* Period Badge */}
                      <span className="px-2 py-0.5 rounded bg-violet-600/10 border border-violet-500/20 text-violet-400 font-mono-custom text-[9px] font-semibold">
                        ID: {occ.eventId}
                      </span>
                    </div>

                    {/* Timeline time frames */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/20 p-2.5 rounded-xl border border-white/5 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Season Starts:</span>
                        <span className="font-semibold text-slate-300 font-mono-custom">
                          {toFriendlyString(occ.timeStart)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Season Ends:</span>
                        <span className="font-semibold text-slate-300 font-mono-custom">
                          {toFriendlyString(occ.timeEnd)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span>Unlock: <strong className="text-slate-300">{parentEvent?.unlockAt || "Chapter 2"}</strong></span>
                      <span>•</span>
                      <span>Real Key: <strong className="text-slate-300">{parentEvent?.realName || "none"}</strong></span>
                    </div>

                    {parentEvent && (
                      <button
                        onClick={() => onEditEvent(parentEvent)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md border border-white/5 hover:border-violet-500/20 transition-colors font-medium"
                      >
                        <Clock size={10} className="text-slate-400" />
                        <span>{isAdmin ? "Edit Config" : "View Config"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
