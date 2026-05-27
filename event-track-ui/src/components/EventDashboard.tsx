import React, { useMemo, useState } from "react";
import { Search, Plus, Calendar, Edit2, Copy, Trash2, Shield, Layers, Power, Ban } from "lucide-react";
import type { GameEvent } from "../types";
import { getEventActiveWindows } from "../utils/dateUtils";

interface EventDashboardProps {
  events: GameEvent[];
  filteredEvents: GameEvent[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedTypes: string[];
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  allCategories: string[];
  selectedLoop: string;
  setSelectedLoop: (val: string) => void;
  selectedPatch: string;
  setSelectedPatch: (val: string) => void;
  isAdmin: boolean;
  onAddEvent: () => void;
  onEditEvent: (event: GameEvent) => void;
  onDuplicateEvent: (event: GameEvent) => void;
  onDeleteEvent: (id: number) => void;
}

export const EventDashboard: React.FC<EventDashboardProps> = ({
  events,
  filteredEvents,
  searchTerm,
  setSearchTerm,
  selectedTypes,
  setSelectedTypes,
  allCategories,
  selectedLoop,
  setSelectedLoop,
  selectedPatch,
  setSelectedPatch,
  isAdmin,
  onAddEvent,
  onEditEvent,
  onDuplicateEvent,
  onDeleteEvent
}) => {

  // System time from game context (defined as May 26, 2026, 11:54)
  const systemTime = useMemo(() => new Date("2026-05-26T11:54:43"), []);

  const [sortBy, setSortBy] = useState<"id" | "live" | "name">("live");

  const sortedFilteredEvents = useMemo(() => {
    const list = [...filteredEvents];
    if (sortBy === "live") {
      return list.sort((a, b) => {
        const aLive = checkEventLiveStatus(a) !== null;
        const bLive = checkEventLiveStatus(b) !== null;
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return a.id - b.id; // fallback to ID
      });
    } else if (sortBy === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list.sort((a, b) => a.id - b.id);
  }, [filteredEvents, sortBy, systemTime]);

  // 1. Calculate statistics
  const stats = useMemo(() => {
    let activeNowCount = 0;
    let loopCount = 0;
    let manualCount = 0;

    for (const e of events) {
      if (e.loop) loopCount++;
      else manualCount++;

      // Check if active now
      const occurrences = getEventActiveWindows(e, new Date("2026-05-25T00:00:00"), new Date("2026-05-27T00:00:00"));
      const isLive = occurrences.some(occ => systemTime >= occ.timeStart && systemTime <= occ.timeEnd);
      if (isLive) activeNowCount++;
    }

    return {
      total: events.length,
      loop: loopCount,
      manual: manualCount,
      active: activeNowCount
    };
  }, [events, systemTime]);

  // 2. Extract distinct patches for the filter dropdown
  const uniquePatches = useMemo(() => {
    const patches = new Set<string>();
    events.forEach(e => {
      if (e.patch) patches.add(e.patch.trim());
    });
    return Array.from(patches).sort();
  }, [events]);



  // Helper to determine active status of a single event card
  const checkEventLiveStatus = (event: GameEvent) => {
    const startRange = new Date(systemTime.getTime() - 86400000); // 1 day pad
    const endRange = new Date(systemTime.getTime() + 86400000);
    const occurrences = getEventActiveWindows(event, startRange, endRange);
    
    // Find matching live occurrence
    const liveOcc = occurrences.find(occ => systemTime >= occ.timeStart && systemTime <= occ.timeEnd);
    return liveOcc || null;
  };

// Beautiful rotating fallback color configurations for custom event types
const customColors = [
  { border: "border-cyan-500/20 hover:border-cyan-500/40", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { border: "border-fuchsia-500/20 hover:border-fuchsia-500/40", badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" },
  { border: "border-pink-500/20 hover:border-pink-500/40", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  { border: "border-orange-500/20 hover:border-orange-500/40", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { border: "border-teal-500/20 hover:border-teal-500/40", badge: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
];

const getCustomColorSet = (type: string) => {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % customColors.length;
  return customColors[idx];
};

  // Helper to resolve event category badge color classes
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "Always": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      case "Growth": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Weekend": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Hero Exclusive": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "New Minigame": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default: return getCustomColorSet(type).badge;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Quick Statistics Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Modules Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Seeded Modules</span>
            <span className="text-2xl font-bold text-white font-display leading-tight">{stats.total}</span>
          </div>
        </div>

        {/* Currently Live Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 animate-pulse">
            <Power size={22} className="glow-text-secondary" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Currently Live Ops</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-400 font-display leading-tight">{stats.active}</span>
              <span className="text-[9px] text-slate-500 uppercase font-mono-custom tracking-wider">Live now</span>
            </div>
          </div>
          {/* Subtle glowing active dot in top right */}
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
        </div>

        {/* Loop configs Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Loop Algorithms</span>
            <span className="text-2xl font-bold text-white font-display leading-tight">{stats.loop}</span>
          </div>
        </div>

        {/* Manual configs Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <Shield size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Manual Calendars</span>
            <span className="text-2xl font-bold text-white font-display leading-tight">{stats.manual}</span>
          </div>
        </div>

      </div>

      {/* 2. Advanced Filters and Control Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Left Side: Search & filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search inputs */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, key, sandbox..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500 text-white placeholder-slate-500"
            />
          </div>

          {/* Setup type filter */}
          <select
            value={selectedLoop}
            onChange={(e) => setSelectedLoop(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-violet-500"
          >
            <option value="All">All Formats</option>
            <option value="Loop">Loop Event (Rule)</option>
            <option value="Manual">Manual Event (Season)</option>
          </select>

          {/* Setup sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "id" | "live" | "name")}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="live">⚡ Live Events First</option>
            <option value="id">Default (Sort by ID)</option>
            <option value="name">🔤 Name (A - Z)</option>
          </select>

          {/* Event Categories Toggle Pills (Multi-Select) */}
          <div className="flex flex-wrap items-center gap-1.5 border-l border-white/10 pl-3">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Categories:</span>
            {allCategories.map((cat) => {
              const isSelected = selectedTypes.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTypes(prev => prev.filter(x => x !== cat));
                    } else {
                      setSelectedTypes(prev => [...prev, cat]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                    isSelected
                      ? "bg-violet-600/10 border-violet-500/30 text-violet-400 font-bold"
                      : "bg-slate-950 border-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            
            <button
              type="button"
              onClick={() => {
                if (selectedTypes.length === allCategories.length) {
                  setSelectedTypes([]);
                } else {
                  setSelectedTypes(allCategories);
                }
              }}
              className="px-2 py-1 text-[9px] font-semibold text-slate-400 hover:text-white rounded-md bg-white/5 transition-colors border border-white/5 shrink-0 animate-float"
            >
              {selectedTypes.length === allCategories.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Patch Filter */}
          <select
            value={selectedPatch}
            onChange={(e) => setSelectedPatch(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:border-violet-500"
          >
            <option value="All">All Patches</option>
            {uniquePatches.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Right Side: Add new module button (Admin only) */}
        {isAdmin && (
          <button
            onClick={onAddEvent}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md hover:shadow-violet-600/20 active:scale-[0.98] shrink-0 w-full md:w-auto"
          >
            <Plus size={16} />
            <span>Add Game Event</span>
          </button>
        )}

      </div>

      {/* 3. Event Modules Grid view */}
      {sortedFilteredEvents.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-500 rounded-3xl border border-white/5 space-y-2">
          <Ban size={40} className="mx-auto text-slate-600 mb-2" />
          <p className="font-semibold text-white">No game modules match your criteria</p>
          <p className="text-xs text-slate-400">Try modifying your search text, type filters or reset your options.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedFilteredEvents.map((event) => {
            const liveOcc = checkEventLiveStatus(event);
            const isLive = !!liveOcc;
            const categoryColors = getTypeBadgeClass(event.type);

            return (
              <div
                key={event.id}
                className="glass-panel rounded-2xl border border-white/5 flex flex-col justify-between overflow-hidden glass-panel-hover"
              >
                {/* Event Top bar: Live Status Indicator */}
                <div className="px-5 py-4 flex items-start justify-between bg-slate-950/20 border-b border-white/5">
                  <div className="space-y-0.5 max-w-[70%]">
                    <h3 className="text-sm font-semibold text-white truncate leading-snug">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase ${categoryColors}`}>
                        {event.type}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono-custom uppercase tracking-wider">
                        {event.patch}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator tag */}
                  {isLive ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono-custom text-[8px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>Live S{liveOcc.season}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-white/5 text-slate-500 font-mono-custom text-[8px] font-bold uppercase tracking-wider">
                      <span>Offline</span>
                    </div>
                  )}
                </div>

                {/* Event Card Body: key parameters */}
                <div className="p-5 flex-1 space-y-4 text-xs">
                  {/* Row: keys info */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/20 p-2.5 rounded-xl border border-white/5 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Sandbox Key:</span>
                      <span className="font-mono-custom font-semibold text-slate-300 break-all leading-tight">
                        {event.sandboxName || "none"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Real Key Name:</span>
                      <span className="font-mono-custom font-semibold text-slate-300 break-all leading-tight">
                        {event.realName || "none"}
                      </span>
                    </div>
                  </div>

                  {/* Row: unlock level and duration details */}
                  <div className="grid grid-cols-3 gap-2 text-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Unlock Level:</span>
                      <span className="font-bold text-white text-[11px] font-display">
                        {event.unlockAt || "Chapter 2"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Active Window:</span>
                      <span className="font-bold text-indigo-400 text-[11px] font-display">
                        {event.durationStr || "14d"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Wait Interval:</span>
                      <span className="font-bold text-emerald-400 text-[11px] font-display">
                        {event.intervalStr || "0m"}
                      </span>
                    </div>
                  </div>

                  {/* Live ops runtime info */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                      <span>Recurrence Loop Structure:</span>
                      <span className="text-violet-400">
                        {event.loop ? "Active Loop Algorithm" : "Manual Static List"}
                      </span>
                    </div>
                    {event.loop ? (
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-[10px] space-y-1 text-slate-400">
                        <div className="flex justify-between">
                          <span>Seasons Counter:</span>
                          <span className="text-slate-200">Start from Season {event.currentSeason || "S1"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Loop gaps:</span>
                          <span className="text-slate-200 truncate max-w-[120px]" title="Interval between season loops">
                            {event.intervalStr || "continuous"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-[10px] space-y-1 text-slate-400">
                        <div className="flex justify-between">
                          <span>Absolute dates:</span>
                          <span className="text-slate-200 truncate max-w-[150px]">
                            {event.dateStart} {event.dateEnd ? `- ${event.dateEnd}` : ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Specific Seasons:</span>
                          <span className="text-slate-200">Manual static grid</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Products / IAPs info */}
                  <div className="space-y-1 text-[10px]">
                    <span className="text-slate-500 block">IAP Product Bindings:</span>
                    <p className="text-slate-400 font-mono-custom text-[9px] bg-slate-950/30 p-2 rounded border border-white/5 line-clamp-2" title={event.iaps}>
                      {event.iaps || "No In-App Purchases associated"}
                    </p>
                  </div>
                </div>

                {/* Event Bottom Actions bar */}
                <div className="px-5 py-3 flex gap-2 border-t border-white/5 bg-slate-950/40">
                  {isAdmin ? (
                    <>
                      {/* Edit button */}
                      <button
                        onClick={() => onEditEvent(event)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-white/5 hover:border-violet-500/20 active:scale-[0.98]"
                      >
                        <Edit2 size={12} className="text-slate-400" />
                        <span>Edit</span>
                      </button>

                      {/* Duplicate button */}
                      <button
                        onClick={() => onDuplicateEvent(event)}
                        className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-white/5 hover:border-emerald-500/20 active:scale-[0.98]"
                        title="Duplicate configuration parameters"
                      >
                        <Copy size={12} />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-white/5 hover:border-rose-500/20 active:scale-[0.98]"
                        title="Remove module"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onEditEvent(event)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg transition-colors border border-white/5 hover:border-violet-500/20 active:scale-[0.98]"
                    >
                      <Layers size={12} className="text-slate-400" />
                      <span>View Configuration</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
