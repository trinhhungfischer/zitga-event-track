import React, { useState, useRef } from "react";
import { Download, Upload, Link2, RefreshCw, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import type { GameEvent } from "../types";
import { generateCSV, parseCSV, csvRowsToEvents } from "../utils/csvUtils";

interface CSVImportExportProps {
  events: GameEvent[];
  isAdmin: boolean;
  onImportEvents: (newEvents: GameEvent[]) => void;
}

export const CSVImportExport: React.FC<CSVImportExportProps> = ({ events, isAdmin, onImportEvents }) => {
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Export CSV
  const handleExport = () => {
    const csvContent = generateCSV(events);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `event_track_config_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus("success", "Exported CSV successfully!");
  };

  // 2. Parse uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const rows = parseCSV(text);
        const imported = csvRowsToEvents(rows);
        if (imported.length === 0) {
          showStatus("error", "Parsed 0 events. Please check the CSV structure and headers.");
          return;
        }
        onImportEvents(imported);
        showStatus("success", `Successfully imported ${imported.length} events from local CSV!`);
      } catch (err) {
        showStatus("error", `Failed to parse file: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow uploading same file
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 3. Sync from Google Sheets CSV published URL
  const handleSyncGoogleSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      showStatus("error", "Please provide a valid URL.");
      return;
    }

    setIsLoading(true);
    setStatusMsg({ type: "", text: "" });

    try {
      // Basic sanitization: if user gives standard Google Sheet sharing link, warn them to publish as CSV
      let cleanUrl = sheetUrl.trim();
      if (cleanUrl.includes("docs.google.com/spreadsheets") && !cleanUrl.includes("output=csv") && !cleanUrl.includes("pub?")) {
        showStatus("error", "This looks like a standard spreadsheet view link. Please follow the instructions below to publish as CSV (.csv).");
        setIsLoading(false);
        return;
      }

      const response = await fetch(cleanUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      const imported = csvRowsToEvents(rows);

      if (imported.length === 0) {
        showStatus("error", "No records found. Make sure the spreadsheet is published and contains correct event columns.");
      } else {
        onImportEvents(imported);
        showStatus("success", `Google Sheets synchronization successful! Imported ${imported.length} events.`);
      }
    } catch (err) {
      console.error(err);
      showStatus("error", `Connection failed: Make sure the spreadsheet is published 'To the Web' and CORS requests are allowed.`);
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(prev => prev.text === text ? { type: "", text: "" } : prev);
    }, 6000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Local Export / Local Import Card */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
        <div>
          <h3 className="text-lg font-display text-white">Local Configuration Files</h3>
          <p className="text-xs text-slate-400">Download config or upload local CSV edits directly</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-violet-600/20 active:scale-[0.98]"
          >
            <Download size={18} />
            <span>Export to CSV</span>
          </button>

          {/* Import Button */}
          {isAdmin ? (
            <label className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl font-medium cursor-pointer transition-all active:scale-[0.98]">
              <Upload size={18} />
              <span>Import CSV file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-slate-500 border border-white/5 rounded-xl font-medium cursor-not-allowed opacity-40">
              <Upload size={18} />
              <span>Import Locked (Admin)</span>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 pt-4 text-xs text-slate-500 flex items-start gap-2">
          <FileSpreadsheet size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <p>
            Export generates an RFC 4180-compliant CSV containing the exact schema of your events (including complex JSON objects). 
            Importing replaces your current workspace list with the data from the CSV file.
          </p>
        </div>
      </div>

      {/* Google Sheets Sync Card */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
        <div>
          <h3 className="text-lg font-display text-white">Google Sheets Live Sync</h3>
          <p className="text-xs text-slate-400">Synchronize your game events directly from Google Sheets</p>
        </div>

        <form onSubmit={handleSyncGoogleSheets} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              disabled={!isAdmin}
              placeholder={isAdmin ? "Paste Google Sheets CSV link..." : "Sync Locked - View Only Mode"}
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-colors ${!isAdmin ? "opacity-50 cursor-not-allowed placeholder-slate-600" : ""}`}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !isAdmin}
            className={`px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-emerald-600/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shrink-0 min-w-[100px] ${!isAdmin ? "opacity-30 cursor-not-allowed hover:bg-emerald-600" : ""}`}
          >
            {isLoading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <span>Sync now</span>
            )}
          </button>
        </form>

        {/* Status Message */}
        {statusMsg.text && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
              : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
          }`}>
            {statusMsg.type === "success" ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Instuctions */}
        <div className="bg-slate-950/40 rounded-xl p-3.5 border border-white/5 space-y-2">
          <span className="text-xs font-semibold text-white">How to get a Google Sheets CSV URL:</span>
          <ol className="list-decimal pl-4 text-slate-400 text-[11px] space-y-1">
            <li>Open your event tracking sheet in Google Sheets.</li>
            <li>Go to <strong className="text-slate-300">File &gt; Share &gt; Publish to web</strong>.</li>
            <li>Choose your sheet tab, select <strong className="text-slate-300">Comma-separated values (.csv)</strong>, and click <strong className="text-indigo-400">Publish</strong>.</li>
            <li>Copy the generated URL in the input box above and click Sync.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
