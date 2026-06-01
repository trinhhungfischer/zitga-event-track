import { useState, useEffect, useMemo, useRef } from "react";
import { Layers, Calendar, FileText, RefreshCw, Plus, CheckCircle, Info, X } from "lucide-react";
import type { GameEvent } from "./types";
import { initialEvents } from "./utils/eventData";
import { EventDashboard } from "./components/EventDashboard";
import { EventTimeline } from "./components/EventTimeline";
import { EventCalendarView } from "./components/EventCalendarView";
import { EventForm } from "./components/EventForm";
import { CSVImportExport } from "./components/CSVImportExport";
import { PDFReference } from "./components/PDFReference";import { parseCSV, csvRowsToEvents } from "./utils/csvUtils";

function App() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "timeline" | "calendar">("dashboard");

  // Lifted Filter States (Shared globally by all views)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Always", "Growth", "Weekend", "Hero Exclusive", "New Minigame"]);
  const [selectedLoop, setSelectedLoop] = useState("All"); // All, Loop, Manual
  const [selectedPatch, setSelectedPatch] = useState("All");

  // Track dynamic list of all unique categories in database
  const allCategories = useMemo(() => {
    const categoriesSet = new Set<string>(["Always", "Growth", "Weekend", "Hero Exclusive", "New Minigame"]);
    events.forEach(e => {
      if (e.type && e.type.trim()) {
        categoriesSet.add(e.type.trim());
      }
    });
    return Array.from(categoriesSet);
  }, [events]);

  const knownCategoriesRef = useRef<string[]>([]);

  // Automatically select NEW categories when they are created
  useEffect(() => {
    if (events.length > 0) {
      const prevKnown = knownCategoriesRef.current;
      const newCats = allCategories.filter(cat => !prevKnown.includes(cat));

      if (newCats.length > 0) {
        setSelectedTypes(prev => {
          const next = [...prev];
          let changed = false;
          newCats.forEach((cat: string) => {
            if (!next.includes(cat)) {
              next.push(cat);
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
      knownCategoriesRef.current = allCategories;
    }
  }, [allCategories, events.length]);
  
  // Admin Authentication states
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("event_track_admin_logged") === "true");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Modals / Drawers state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [isDocOpen, setIsDocOpen] = useState(false);
  
  // Quick notice triggers
  const [notice, setNotice] = useState("");

  // Option to configure a default team-wide Google Sheet URL for instant sync
  const DEFAULT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfO098G7uv1O2Z1-4HmPKqBK6rB39uKARvEcnty82HIIM72WVhMfoA9aine0K8jzar-8mTLGX8pc2z/pub?gid=1725209412&single=true&output=csv";

  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => {
    return localStorage.getItem("google_sheet_sync_url") || DEFAULT_GOOGLE_SHEET_URL || "";
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // 2. Persist state changes to localStorage
  const saveEventsList = (updatedList: GameEvent[]) => {
    // Sort events by ID or name
    const sorted = [...updatedList].sort((a, b) => a.id - b.id);
    setEvents(sorted);
    localStorage.setItem("game_events_config", JSON.stringify(sorted));
  };

  const toHex = (str: string): string => {
    return Array.from(str)
      .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
  };

  const fromHex = (hex: string): string => {
    try {
      const cleanHex = hex.trim();
      let raw = cleanHex;
      if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.slice(1, -1);
      }
      if (!/^[0-9a-fA-F]+$/.test(raw)) return raw;
      const matched = raw.match(/.{1,2}/g);
      return matched ? matched.map(byte => String.fromCharCode(parseInt(byte, 16))).join("") : raw;
    } catch (e) {
      return hex;
    }
  };

  const syncWithGoogleSheet = async (url: string, propagateToCloud = false) => {
    if (!url.trim()) return false;
    setIsAutoSyncing(true);
    try {
      let cleanUrl = url.trim();
      if (cleanUrl.includes("docs.google.com/spreadsheets") && !cleanUrl.includes("output=csv") && !cleanUrl.includes("pub?")) {
        throw new Error("Invalid URL: This looks like a standard spreadsheet link. Publish as CSV (.csv) instead.");
      }

      const response = await fetch(cleanUrl);
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      const imported = csvRowsToEvents(rows);

      if (imported.length === 0) {
        throw new Error("No events parsed. Verify sheet headers.");
      }

      saveEventsList(imported);
      localStorage.setItem("google_sheet_sync_url", cleanUrl);
      setGoogleSheetUrl(cleanUrl);

      // Propagate the new URL to the cloud key-value store if requested (Admin action)
      if (propagateToCloud && isAdmin) {
        try {
          const hexUrl = toHex(cleanUrl);
          await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/9z9a0g3w/active_sheet_url/${hexUrl}`, {
            method: "POST"
          });
          console.log("Successfully propagated new Google Sheets URL to cloud database.");
        } catch (e) {
          console.error("Failed to propagate new URL to cloud:", e);
        }
      }

      showNotice(`Auto-synchronized ${imported.length} events from Google Sheets!`);
      return true;
    } catch (err) {
      console.error("Google Sheets Auto-Sync failed:", err);
      showNotice(`Auto-sync failed: ${(err as Error).message}. Loaded local offline cache.`);
      return false;
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // 1. Initial Load from localStorage or seed and background auto-sync
  useEffect(() => {
    // A. First, load from local storage to show data instantly
    const local = localStorage.getItem("game_events_config");
    if (local) {
      try {
        setEvents(JSON.parse(local));
      } catch (e) {
        console.error("Failed to parse local storage events, loading seeds");
        setEvents(initialEvents);
      }
    } else {
      setEvents(initialEvents);
      localStorage.setItem("game_events_config", JSON.stringify(initialEvents));
    }

    // B. Then, check the cloud database for the active Google Sheet URL and sync
    const fetchActiveSheetAndSync = async () => {
      let targetUrl = DEFAULT_GOOGLE_SHEET_URL;

      try {
        // Query the secure KV store for the active sheet URL
        const cloudResponse = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/9z9a0g3w/active_sheet_url`);
        if (cloudResponse.ok) {
          let cloudUrlText = await cloudResponse.text();
          const cloudUrl = fromHex(cloudUrlText);
          if (cloudUrl && cloudUrl.startsWith("http")) {
            targetUrl = cloudUrl;
            console.log("Loaded active Google Sheet URL from cloud database:", targetUrl);
          }
        }
      } catch (e) {
        console.warn("Could not fetch active sheet URL from cloud, using default/cached:", e);
        // Fall back to local storage URL if available
        const localUrl = localStorage.getItem("google_sheet_sync_url");
        if (localUrl) targetUrl = localUrl;
      }

      if (targetUrl) {
        syncWithGoogleSheet(targetUrl, false);
      }
    };

    fetchActiveSheetAndSync();
  }, []);

  // 2.5 Unified Filtered Events selector (shared globally across Dashboard, Timeline and Calendar)
  const filteredEvents = events.filter(e => {
    // Search text match (Name, SandboxName, RealName)
    const matchesSearch = 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sandboxName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.realName.toLowerCase().includes(searchTerm.toLowerCase());

    // Type match (Loại event) - matches if category is checked in the selectedTypes list
    const matchesType = selectedTypes.includes(e.type);

    // Loop vs Manual match
    const matchesLoop = 
      selectedLoop === "All" || 
      (selectedLoop === "Loop" && e.loop) ||
      (selectedLoop === "Manual" && !e.loop);

    // Patch match
    const matchesPatch = selectedPatch === "All" || e.patch.trim() === selectedPatch;

    return matchesSearch && matchesType && matchesLoop && matchesPatch;
  });

  // 3. CRUD Event handlers
  const handleAddEvent = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleEditEvent = (event: GameEvent) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleDuplicateEvent = (event: GameEvent) => {
    const copy: GameEvent = {
      ...event,
      id: Math.floor(Math.random() * 100000), // Random ID
      name: `${event.name} (Copy)`,
      sandboxName: event.sandboxName ? `${event.sandboxName}_copy` : "",
      realName: event.realName ? `${event.realName}_copy` : ""
    };
    
    saveEventsList([...events, copy]);
    showNotice(`Successfully duplicated "${event.name}"!`);
  };

  const handleDeleteEvent = (id: number) => {
    const target = events.find(e => e.id === id);
    if (!target) return;
    
    if (window.confirm(`Are you sure you want to remove the event "${target.name}"?`)) {
      const updated = events.filter(e => e.id !== id);
      saveEventsList(updated);
      showNotice(`Successfully deleted "${target.name}"!`);
    }
  };

  const handleSaveForm = (savedEvent: GameEvent) => {
    const exists = events.some(e => e.id === savedEvent.id);
    let updated: GameEvent[];
    
    if (exists) {
      updated = events.map(e => e.id === savedEvent.id ? savedEvent : e);
      showNotice(`Updated event "${savedEvent.name}" successfully!`);
    } else {
      updated = [...events, savedEvent];
      showNotice(`Created new event "${savedEvent.name}"!`);
    }
    
    saveEventsList(updated);
    setIsFormOpen(false);
    setSelectedEvent(null);
  };

  // 4. Batch Import handler
  const handleImportEvents = (importedList: GameEvent[]) => {
    saveEventsList(importedList);
    showNotice(`Synchronized ${importedList.length} events successfully!`);
  };

  // 5. Reset Database helper
  const handleResetDatabase = () => {
    if (window.confirm("WARNING: This will overwrite all custom configurations and restore the original 17 events from the PDF. Do you want to proceed?")) {
      saveEventsList(initialEvents);
      showNotice("Database restored to default seeds successfully.");
    }
  };

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => {
      setNotice(prev => prev === text ? "" : prev);
    }, 4500);
  };

  return (
    <div className="min-h-screen pb-16 relative flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 pt-8">
        
        {/* Header Branding section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30 animate-float">
                <Layers size={20} />
              </div>
              <h1 className="text-3xl font-display font-extrabold text-white tracking-tight leading-none">
                EVENT<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">TRACK</span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Live Operations and Scheduling Configurator for Game Design
            </p>
          </div>

          {/* Navigation Controls and Drawer triggers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Admin Badge and Login/Logout Action */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Admin Mode</span>
                </div>
                <button
                  onClick={() => {
                    setIsAdmin(false);
                    localStorage.removeItem("event_track_admin_logged");
                    showNotice("Logged out from Admin Mode.");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginUser("");
                  setLoginPass("");
                  setLoginError("");
                  setIsLoginModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 hover:text-violet-300 border border-violet-500/30 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span>Login as Admin</span>
              </button>
            )}

            {/* Database Restore Action (Admin only) */}
            {isAdmin && (
              <button
                onClick={handleResetDatabase}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-white/15 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all shadow"
                title="Reset config to PDF templates"
              >
                <RefreshCw size={14} />
                <span>Reset Data</span>
              </button>
            )}

            {/* View Documentation PDF reference */}
            <button
              onClick={() => setIsDocOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-white/15 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all shadow"
            >
              <FileText size={14} />
              <span>View PDF Notes</span>
            </button>

            {/* Quick Add Module trigger (Admin only) */}
            {isAdmin && (
              <button
                onClick={handleAddEvent}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-violet-600/10 active:scale-[0.98]"
              >
                <Plus size={15} />
                <span>New Module</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-white/5 pb-0.5 text-sm gap-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 pb-3 font-semibold border-b-2 transition-all relative ${
              activeTab === "dashboard"
                ? "border-violet-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={16} />
            <span>Config Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 pb-3 font-semibold border-b-2 transition-all relative ${
              activeTab === "timeline"
                ? "border-violet-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Calendar size={16} />
            <span>Interactive Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-2 pb-3 font-semibold border-b-2 transition-all relative ${
              activeTab === "calendar"
                ? "border-violet-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Calendar size={16} className="text-emerald-400" />
            <span>Monthly Grid Calendar</span>
          </button>
        </div>

        {/* Sync / CRUD notifications popup */}
        {notice && (
          <div className="fixed bottom-6 right-6 z-50 glass-panel border-emerald-500/20 bg-emerald-950/80 px-4 py-3 rounded-2xl flex items-center gap-2 text-emerald-300 shadow-2xl animate-bounce">
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-400" />
            <span className="text-xs font-medium">{notice}</span>
          </div>
        )}

        {/* Primary Route Pages Container */}
        <main className="space-y-8">
          {activeTab === "dashboard" && (
            <>
              {/* Dashboard Content */}
              <EventDashboard
                events={events}
                filteredEvents={filteredEvents}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedTypes={selectedTypes}
                setSelectedTypes={setSelectedTypes}
                allCategories={allCategories}
                selectedLoop={selectedLoop}
                setSelectedLoop={setSelectedLoop}
                selectedPatch={selectedPatch}
                setSelectedPatch={setSelectedPatch}
                isAdmin={isAdmin}
                onAddEvent={handleAddEvent}
                onEditEvent={handleEditEvent}
                onDuplicateEvent={handleDuplicateEvent}
                onDeleteEvent={handleDeleteEvent}
              />

              {/* Data Portability Panel (CSV and Google Sheet import/export) */}
              <div className="border-t border-white/5 pt-8">
                <CSVImportExport 
                  events={events} 
                  isAdmin={isAdmin} 
                  onImportEvents={handleImportEvents} 
                  sheetUrl={googleSheetUrl}
                  setSheetUrl={setGoogleSheetUrl}
                  onSync={syncWithGoogleSheet}
                  isSyncing={isAutoSyncing}
                />
              </div>
            </>
          )}

          {activeTab === "timeline" && (
            /* Timeline Content - Respects filters */
            <EventTimeline events={filteredEvents} />
          )}

          {activeTab === "calendar" && (
            /* Calendar Grid - Respects filters and visual tags */
            <EventCalendarView events={filteredEvents} isAdmin={isAdmin} onEditEvent={handleEditEvent} />
          )}
        </main>

      </div>

      {/* Footer bar */}
      <footer className="text-center text-[10px] text-slate-500 pt-16 border-t border-white/5 w-full mt-16 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center gap-1">
          <Info size={10} className="text-slate-600" />
          <span>Active Loop scheduling outputs calibrated automatically for 2026. Custom calendar outputs serialized to standard RFC 4180.</span>
        </div>
      </footer>

      {/* CRUD Form slider modal overlay */}
      <EventForm
        isOpen={isFormOpen}
        event={selectedEvent}
        isAdmin={isAdmin}
        allCategories={allCategories}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveForm}
      />

      {/* Cheat sheet side drawer */}
      <PDFReference
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
      />

      {/* Login Modal Overlay */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-center justify-center px-4 text-center">
            
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsLoginModalOpen(false)} />

            {/* Modal Body */}
            <div className="inline-block transform overflow-hidden rounded-2xl bg-[#0f172a] border border-white/10 p-6 text-left align-middle shadow-2xl transition-all sm:w-full sm:max-w-md w-full z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-lg font-display text-white font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-float" />
                  <span>Admin Authentication</span>
                </h3>
                <button 
                  onClick={() => setIsLoginModalOpen(false)} 
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (loginUser.trim() === "admin" && loginPass === "hung123456@") {
                    setIsAdmin(true);
                    localStorage.setItem("event_track_admin_logged", "true");
                    setIsLoginModalOpen(false);
                    setLoginError("");
                    showNotice("Logged in as Admin successfully!");
                  } else {
                    setLoginError("Tên đăng nhập hoặc mật khẩu không chính xác.");
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Username</label>
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                    placeholder="Enter username..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-500 text-white"
                    placeholder="Enter password..."
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg leading-snug">
                    {loginError}
                  </p>
                )}

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="px-4 py-2 border border-white/10 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors shadow shadow-violet-600/20"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
