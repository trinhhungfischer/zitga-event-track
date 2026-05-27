import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Plus, Trash, Check } from "lucide-react";
import type { GameEvent, ManualSeason } from "../types";
import { parseGameDate, formatGameDate } from "../utils/dateUtils";

interface EventFormProps {
  isOpen: boolean;
  event: GameEvent | null; // null if creating a new event
  isAdmin: boolean;
  onClose: () => void;
  onSave: (savedEvent: GameEvent) => void;
  allCategories?: string[];
}

export const EventForm: React.FC<EventFormProps> = ({ isOpen, event, isAdmin, onClose, onSave, allCategories = [] }) => {
  // Base fields
  const [name, setName] = useState("");
  const [patch, setPatch] = useState("Patch 3");
  const [doc, setDoc] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [loop, setLoop] = useState(true);
  const [type, setType] = useState("Always");
  const [customType, setCustomType] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [durationStr, setDurationStr] = useState("14d");
  const [intervalStr, setIntervalStr] = useState("0m");
  const [sandboxName, setSandboxName] = useState("");
  const [realName, setRealName] = useState("");
  const [iaps, setIaps] = useState("");
  const [currentSeason, setCurrentSeason] = useState("");
  const [remoteConfigStr, setRemoteConfigStr] = useState("{}");

  // State management for visual subform builders
  const [jsonError, setJsonError] = useState("");
  
  // Loop Config State
  const [loopTimeStart, setLoopTimeStart] = useState("2026-01-12T00:00");
  const [loopDurationDays, setLoopDurationDays] = useState(14);
  const [loopDurationSec, setLoopDurationSec] = useState(1209600);
  const [loopSeasonStart, setLoopSeasonStart] = useState(1);
  const [loopIntervals, setLoopIntervals] = useState<number[]>([2]);
  const [loopDataIds, setLoopDataIds] = useState<number[]>([0]);
  
  // Loop Override Subform State
  const [hasOverride, setHasOverride] = useState(false);
  const [overrideStart, setOverrideStart] = useState("2025-12-23T23:59");
  const [overrideEnd, setOverrideEnd] = useState("2026-01-11T23:59");
  const [overrideSeasonNum, setOverrideSeasonNum] = useState(1);
  const [overrideDataId, setOverrideDataId] = useState(0);

  // Manual Config State
  const [manualSeasons, setManualSeasons] = useState<ManualSeason[]>([]);

  // 1. Initialize Form when Event changes
  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      setName(event.name);
      setPatch(event.patch);
      setDoc(event.doc);
      setDateStart(event.dateStart);
      setDateEnd(event.dateEnd);
      setLoop(event.loop);
      setType(event.type);
      setCustomType("");
      setUnlockAt(event.unlockAt);
      setDurationStr(event.durationStr);
      setIntervalStr(event.intervalStr);
      setSandboxName(event.sandboxName);
      setRealName(event.realName);
      setIaps(event.iaps);
      setCurrentSeason(event.currentSeason);
      setRemoteConfigStr(event.remoteConfigStr);
      
      // Parse JSON configuration to pre-load visual editors
      parseConfigJson(event.remoteConfigStr, event.loop);
    } else {
      // Setup Defaults for New Event
      setName("");
      setPatch("Patch 3");
      setDoc("");
      setDateStart("");
      setDateEnd("");
      setLoop(true);
      setType("Always");
      setCustomType("");
      setUnlockAt("Chapter 2");
      setDurationStr("14d");
      setIntervalStr("0m");
      setSandboxName("");
      setRealName("");
      setIaps("");
      setCurrentSeason("");
      
      // Default configurations
      const defaultLoopJson = '{"rule":{"timeStart":20260112000001,"duration":1209598,"seasonStart":2,"intervals":[2],"dataIds":[0]},"overrideSeason":{"timeStart":20251223235959,"timeEnd":20260111235959,"season":1,"dataId":0}}';
      setRemoteConfigStr(defaultLoopJson);
      parseConfigJson(defaultLoopJson, true);
    }
  }, [event, isOpen]);

  // 2. Parse configuration JSON and populate form fields
  const parseConfigJson = (jsonStr: string, isLoopMode: boolean) => {
    try {
      setJsonError("");
      if (!jsonStr || jsonStr === "{}") {
        setManualSeasons([]);
        setHasOverride(false);
        return;
      }

      const parsed = JSON.parse(jsonStr);

      if (isLoopMode) {
        if (parsed.rule) {
          const rule = parsed.rule;
          // Format ISO time for date-time input
          const startD = parseGameDate(rule.timeStart);
          setLoopTimeStart(toLocalISOString(startD));
          setLoopDurationSec(rule.duration);
          setLoopDurationDays(Math.round(rule.duration / 86400));
          setLoopSeasonStart(rule.seasonStart);
          setLoopIntervals(rule.intervals || [2]);
          setLoopDataIds(rule.dataIds || [0]);
        }

        if (parsed.overrideSeason) {
          setHasOverride(true);
          const override = parsed.overrideSeason;
          setOverrideStart(toLocalISOString(parseGameDate(override.timeStart)));
          setOverrideEnd(toLocalISOString(parseGameDate(override.timeEnd)));
          setOverrideSeasonNum(override.season);
          setOverrideDataId(override.dataId);
        } else {
          setHasOverride(false);
        }
      } else {
        if (parsed.manualSeason && Array.isArray(parsed.manualSeason)) {
          setManualSeasons(parsed.manualSeason);
        } else {
          setManualSeasons([]);
        }
      }
    } catch (e) {
      setJsonError("Warning: Config data contains invalid JSON schema, form builder disabled.");
    }
  };

  // Convert Date object to local YYYY-MM-DDThh:mm for datetime-local input
  const toLocalISOString = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Build local datetime format back to game format integer
  const fromISOToGameDate = (isoStr: string): number => {
    const date = new Date(isoStr);
    return formatGameDate(date);
  };

  // 3. Compile local form states back to JSON string
  const compileFormToJson = (
    isLoop: boolean,
    loopData: any = null,
    manualData: any = null
  ): string => {
    if (isLoop) {
      const startNum = fromISOToGameDate(loopData?.timeStart || loopTimeStart);
      const rule = {
        timeStart: startNum,
        duration: loopData?.duration || loopDurationSec,
        seasonStart: loopData?.seasonStart || loopSeasonStart,
        intervals: loopData?.intervals || loopIntervals,
        dataIds: loopData?.dataIds || loopDataIds
      };

      const compiled: any = { rule };

      const overrideEnabled = loopData?.hasOverride !== undefined ? loopData.hasOverride : hasOverride;
      if (overrideEnabled) {
        compiled.overrideSeason = {
          timeStart: fromISOToGameDate(loopData?.overrideStart || overrideStart),
          timeEnd: fromISOToGameDate(loopData?.overrideEnd || overrideEnd),
          season: loopData?.overrideSeasonNum || overrideSeasonNum,
          dataId: loopData?.overrideDataId || overrideDataId
        };
      }

      return JSON.stringify(compiled);
    } else {
      const compiled = {
        manualSeason: manualData || manualSeasons
      };
      return JSON.stringify(compiled);
    }
  };

  // Sync state when visual changes are made in Loop Mode
  const handleLoopFieldChange = (updates: any) => {
    const nextState = {
      timeStart: loopTimeStart,
      duration: loopDurationSec,
      seasonStart: loopSeasonStart,
      intervals: loopIntervals,
      dataIds: loopDataIds,
      hasOverride,
      overrideStart,
      overrideEnd,
      overrideSeasonNum,
      overrideDataId,
      ...updates
    };

    if (updates.durationDays !== undefined) {
      nextState.duration = updates.durationDays * 86400;
      setLoopDurationSec(nextState.duration);
    }

    const compiledJson = compileFormToJson(true, nextState);
    setRemoteConfigStr(compiledJson);
  };

  // Sync state when visual changes are made in Manual Mode
  const handleManualSeasonsChange = (updatedSeasons: ManualSeason[]) => {
    setManualSeasons(updatedSeasons);
    const compiledJson = compileFormToJson(false, null, updatedSeasons);
    setRemoteConfigStr(compiledJson);
  };

  // Handle direct modifications in Raw JSON textarea
  const handleRawJsonChange = (val: string) => {
    setRemoteConfigStr(val);
    try {
      JSON.parse(val);
      setJsonError("");
      // Sync back to form fields
      parseConfigJson(val, loop);
    } catch (e) {
      setJsonError("Invalid JSON syntax: " + (e as Error).message);
    }
  };

  const handleLoopToggle = (val: boolean) => {
    setLoop(val);
    const defaultJson = val
      ? compileFormToJson(true)
      : compileFormToJson(false);
    setRemoteConfigStr(defaultJson);
    parseConfigJson(defaultJson, val);
  };

  // Save changes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify raw JSON syntax before saving
    try {
      JSON.parse(remoteConfigStr);
    } catch (err) {
      alert("Cannot save event: The Remote Config JSON contains syntax errors.");
      return;
    }

    const savedEvent: GameEvent = {
      id: event ? event.id : Math.floor(Math.random() * 10000), // Random ID if new
      name: name.trim() || "Untitled Event",
      doc,
      patch,
      dateStart,
      dateEnd,
      loop,
      type: type === "_custom" ? (customType.trim() || "Custom") : type,
      unlockAt,
      durationStr,
      intervalStr,
      sandboxName,
      realName,
      remoteConfigStr,
      iaps,
      currentSeason
    };

    onSave(savedEvent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative transform overflow-hidden rounded-2xl bg-[#0f172a] border border-white/10 text-left shadow-2xl transition-all w-full max-w-4xl max-h-[90vh] flex flex-col z-10">
        
        {/* Header (Sticky Header) */}
        <div className="glass-panel px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-display text-white font-bold" id="modal-title">
            {isAdmin 
              ? (event ? `Edit Event: ${event.name}` : "Create New Game Event") 
              : `View Event Configuration: ${event?.name || ""}`}
          </h3>
          <button 
            onClick={onClose} 
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form wrapper with nested scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-6">
            <fieldset disabled={!isAdmin} className="min-w-0 w-full grid grid-cols-1 md:grid-cols-2 gap-6 border-0 p-0 m-0">
              
              {/* Left Column: General Configuration parameters */}
              <div className="space-y-4">
                <h4 className="text-xs font-display text-indigo-400 uppercase tracking-wider">General Information</h4>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Event Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                    placeholder="e.g. Battle Pass - Season Loop"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Loại Event (Type)</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                    >
                      {Array.from(new Set(["Always", "Growth", "Weekend", "Hero Exclusive", "New Minigame", ...allCategories])).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="_custom">+ Custom Type...</option>
                    </select>

                    {type === "_custom" && (
                      <div className="space-y-1 mt-2">
                        <label className="text-xs text-violet-400 font-semibold">Custom Category Name</label>
                        <input
                          type="text"
                          required
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-violet-500/30 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                          placeholder="e.g. Battle Pass, Gacha, Flash Sale"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Start in Patch</label>
                    <input
                      type="text"
                      value={patch}
                      onChange={(e) => setPatch(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. Patch 3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Unlock At</label>
                    <input
                      type="text"
                      value={unlockAt}
                      onChange={(e) => setUnlockAt(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. Chapter 10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Duration Tag (PDF Reference)</label>
                    <input
                      type="text"
                      value={durationStr}
                      onChange={(e) => setDurationStr(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. 14d"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Interval Tag (PDF Reference)</label>
                    <input
                      type="text"
                      value={intervalStr}
                      onChange={(e) => setIntervalStr(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. 14d"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Current Season Tag</label>
                    <input
                      type="text"
                      value={currentSeason}
                      onChange={(e) => setCurrentSeason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. Season 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Sandbox Key Name</label>
                    <input
                      type="text"
                      value={sandboxName}
                      onChange={(e) => setSandboxName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. battle_pass_loop_test"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Real Key Name</label>
                    <input
                      type="text"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. battle_pass_loop"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">IAP Product Identifiers (comma separated)</label>
                  <textarea
                    rows={2}
                    value={iaps}
                    onChange={(e) => setIaps(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white font-mono-custom text-xs"
                    placeholder="com.thp020.stickman.casual.war.game.season_pass"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Start Date Display</label>
                    <input
                      type="text"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. 12/Jan/26"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">End Date Display (optional)</label>
                    <input
                      type="text"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                      placeholder="e.g. 12/Nov/25"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Scheduling configurations */}
              <div className="space-y-6 flex flex-col">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-display text-indigo-400 uppercase tracking-wider">Remote Schedule Builder</h4>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => handleLoopToggle(true)}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${loop ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Loop Config
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoopToggle(false)}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${!loop ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Manual Config
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* LOOP EVENT FORM BUILDER */}
                  {loop ? (
                    <div className="space-y-4">
                      
                      {/* Loop Start and Duration */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Loop Starting Time</label>
                          <input
                            type="datetime-local"
                            value={loopTimeStart}
                            onChange={(e) => {
                              setLoopTimeStart(e.target.value);
                              handleLoopFieldChange({ timeStart: e.target.value });
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-violet-500 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Duration (in Days)</label>
                          <input
                            type="number"
                            min={1}
                            value={loopDurationDays}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setLoopDurationDays(val);
                              handleLoopFieldChange({ durationDays: val });
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                          />
                        </div>
                      </div>

                      {/* Loop Season Start & dataIds */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Starting Season Index</label>
                          <input
                            type="number"
                            min={1}
                            value={loopSeasonStart}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setLoopSeasonStart(val);
                              handleLoopFieldChange({ seasonStart: val });
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Data IDs (comma list)</label>
                          <input
                            type="text"
                            value={loopDataIds.join(", ")}
                            onChange={(e) => {
                              const arr = e.target.value.split(",").map(x => parseInt(x.trim())).filter(x => !isNaN(x));
                              setLoopDataIds(arr.length ? arr : [0]);
                              handleLoopFieldChange({ dataIds: arr.length ? arr : [0] });
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-violet-500 text-white font-mono-custom"
                            placeholder="e.g. 0, 1, 2"
                          />
                        </div>
                      </div>

                      {/* Intervals list */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Intervals (wait-gaps in seconds, comma separated)</label>
                        <input
                          type="text"
                          value={loopIntervals.join(", ")}
                          onChange={(e) => {
                            const arr = e.target.value.split(",").map(x => parseInt(x.trim())).filter(x => !isNaN(x));
                            setLoopIntervals(arr.length ? arr : [2]);
                            handleLoopFieldChange({ intervals: arr.length ? arr : [2] });
                          }}
                          className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-violet-500 text-white font-mono-custom"
                          placeholder="e.g. 2, 172802"
                        />
                        <span className="text-[10px] text-slate-500">
                          Use <code className="bg-slate-950 px-1 py-0.5 rounded">2</code> for instant continuous, or <code className="bg-slate-950 px-1 py-0.5 rounded">1209600</code> for 14-day gap.
                        </span>
                      </div>

                      {/* Override Season Section */}
                      <div className="border border-white/5 rounded-xl p-3 bg-slate-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">Include Override Season (e.g. Season 1)</span>
                          <input
                            type="checkbox"
                            checked={hasOverride}
                            onChange={(e) => {
                              setHasOverride(e.target.checked);
                              handleLoopFieldChange({ hasOverride: e.target.checked });
                            }}
                            className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4 bg-slate-900 border-white/10"
                          />
                        </div>

                        {hasOverride && (
                          <div className="space-y-3 pt-2 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1 col-span-2">
                              <label className="text-slate-400">Override Start Time</label>
                              <input
                                type="datetime-local"
                                value={overrideStart}
                                onChange={(e) => {
                                  setOverrideStart(e.target.value);
                                  handleLoopFieldChange({ overrideStart: e.target.value });
                                }}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-md focus:outline-none text-white text-xs"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-slate-400">Override End Time</label>
                              <input
                                type="datetime-local"
                                value={overrideEnd}
                                onChange={(e) => {
                                  setOverrideEnd(e.target.value);
                                  handleLoopFieldChange({ overrideEnd: e.target.value });
                                }}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-md focus:outline-none text-white text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-slate-400">Override Season ID</label>
                              <input
                                type="number"
                                value={overrideSeasonNum}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setOverrideSeasonNum(val);
                                  handleLoopFieldChange({ overrideSeasonNum: val });
                                }}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-md focus:outline-none text-white text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-slate-400">Override Data ID</label>
                              <input
                                type="number"
                                value={overrideDataId}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setOverrideDataId(val);
                                  handleLoopFieldChange({ overrideDataId: val });
                                }}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-md focus:outline-none text-white text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* MANUAL EVENT FORM BUILDER */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400">Manual Seasons List</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSeason: ManualSeason = {
                              timeStart: 20260422000001,
                              timeEnd: 20260508000001,
                              season: manualSeasons.length + 1,
                              dataId: 0,
                              lockedDuration: 172800
                            };
                            handleManualSeasonsChange([...manualSeasons, newSeason]);
                          }}
                          className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-medium"
                        >
                          <Plus size={12} />
                          <span>Add Season</span>
                        </button>
                      </div>

                      {manualSeasons.length === 0 ? (
                        <div className="py-6 text-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                          No manual seasons scheduled. Click Add Season to schedule a window.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {manualSeasons.map((ms, index) => {
                            const ISOStart = toLocalISOString(parseGameDate(ms.timeStart));
                            const ISOEnd = toLocalISOString(parseGameDate(ms.timeEnd));
                            
                            return (
                              <div key={index} className="p-3 bg-slate-950/20 border border-white/5 rounded-xl space-y-2 relative text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = manualSeasons.filter((_, i) => i !== index);
                                    handleManualSeasonsChange(updated);
                                  }}
                                  className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                >
                                  <Trash size={14} />
                                </button>

                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500">Season Index</label>
                                    <input
                                      type="number"
                                      value={ms.season}
                                      onChange={(e) => {
                                        const updated = [...manualSeasons];
                                        updated[index] = { ...ms, season: parseInt(e.target.value) || 1 };
                                        handleManualSeasonsChange(updated);
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 px-2 py-1 rounded text-white font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500">Data ID</label>
                                    <input
                                      type="number"
                                      value={ms.dataId}
                                      onChange={(e) => {
                                        const updated = [...manualSeasons];
                                        updated[index] = { ...ms, dataId: parseInt(e.target.value) || 0 };
                                        handleManualSeasonsChange(updated);
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 px-2 py-1 rounded text-white font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500">Lock Sec (opt)</label>
                                    <input
                                      type="number"
                                      value={ms.lockedDuration || 0}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const updated = [...manualSeasons];
                                        if (val > 0) {
                                          updated[index] = { ...ms, lockedDuration: val };
                                        } else {
                                          delete updated[index].lockedDuration;
                                        }
                                        handleManualSeasonsChange(updated);
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 px-2 py-1 rounded text-white font-medium"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div>
                                    <label className="text-slate-500">Start Time</label>
                                    <input
                                      type="datetime-local"
                                      value={ISOStart}
                                      onChange={(e) => {
                                        const updated = [...manualSeasons];
                                        updated[index] = { ...ms, timeStart: fromISOToGameDate(e.target.value) };
                                        handleManualSeasonsChange(updated);
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 px-2 py-1 rounded text-white text-[11px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-slate-500">End Time</label>
                                    <input
                                      type="datetime-local"
                                      value={ISOEnd}
                                      onChange={(e) => {
                                        const updated = [...manualSeasons];
                                        updated[index] = { ...ms, timeEnd: fromISOToGameDate(e.target.value) };
                                        handleManualSeasonsChange(updated);
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 px-2 py-1 rounded text-white text-[11px]"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* RAW JSON EDIT AREA */}
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Remote Config Data JSON (Raw)</span>
                    {jsonError ? (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                        <AlertCircle size={12} />
                        <span>Syntax Error</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-semibold">
                        <Check size={12} />
                        <span>Valid JSON Config</span>
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={remoteConfigStr}
                    onChange={(e) => handleRawJsonChange(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs font-mono-custom text-slate-300 focus:outline-none focus:ring-1 ${
                      jsonError ? "border-rose-500/50 focus:ring-rose-500" : "border-white/10 focus:ring-violet-500"
                    }`}
                  />
                  {jsonError && <p className="text-[10px] text-rose-400/90 font-mono-custom leading-tight">{jsonError}</p>}
                </div>

              </div>

            </fieldset>
          </div>

          {/* Form actions (Sticky Footer) */}
          <div className="glass-panel px-6 py-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/10 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              {isAdmin ? "Cancel" : "Close"}
            </button>
            {isAdmin && (
              <button
                type="submit"
                disabled={!!jsonError}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-sm font-semibold text-white rounded-lg transition-all shadow-md hover:shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={16} />
                <span>Save Event</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
