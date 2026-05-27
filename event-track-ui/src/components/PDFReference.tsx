import React from "react";
import { X, HelpCircle, FileText, Info } from "lucide-react";

interface PDFReferenceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PDFReference: React.FC<PDFReferenceProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-2xl">
            <div className="flex h-full flex-col overflow-y-scroll bg-[#0f172a] border-l border-white/10 shadow-2xl">
              {/* Header */}
              <div className="glass-panel px-6 py-5 border-b border-white/10 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400 border border-violet-500/20">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-display text-white" id="slide-over-title">Game Event Setup Documentation</h2>
                    <p className="text-xs text-slate-400">Rules extracted from "020-stickman-xx - EVENT TRACK.pdf"</p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 space-y-8 text-sm text-slate-300">
                {/* Intro */}
                <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-violet-400 font-semibold">
                    <Info size={16} />
                    <span>How Events Work</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-xs">
                    Events inside the game can run in one of two modes: **Loop** or **Manual**. 
                    Configurations are loaded via the `Remote Config Data` JSON column. The app dynamically schedules these rules to track active windows across 2026.
                  </p>
                </div>

                {/* Event Types Rules */}
                <div className="space-y-4">
                  <h3 className="text-md font-display text-white border-b border-white/10 pb-2">1. Loop Events</h3>
                  <p className="text-xs text-slate-400">
                    Loop events automatically cycle seasons continuously. Each cycle has a run duration and a rest interval.
                  </p>
                  
                  <div className="bg-slate-900/50 border border-white/5 rounded-lg p-4 font-mono-custom text-xs text-slate-300 space-y-2">
                    <div className="text-violet-400 font-semibold">// Example JSON Config structure</div>
                    <pre className="overflow-x-auto whitespace-pre-wrap">
{`{
  "rule": {
    "timeStart": 20260112000001,  // Loop begins on Jan 12, 2026, at 00:00:01
    "duration": 1209598,          // Active duration per season in seconds (14 days - 2s)
    "seasonStart": 2,             // Loop starts counting from Season 2
    "intervals": [2],             // Wait gap between seasons in seconds
    "dataIds": [0]                // Config identifier mapping to loop through
  },
  "overrideSeason": {             // Optional manual override for a specific season
    "timeStart": 20251223235959,  // Override start
    "timeEnd": 20260111235959,    // Override end
    "season": 1,                  // Override is Season 1
    "dataId": 0
  }
}`}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-white/5 space-y-1">
                      <span className="font-semibold text-white">Interval Logic</span>
                      <p className="text-slate-400">The loop advances by: `NextStart = CurrentEnd + intervals[i]`. If multiple intervals are provided (e.g. `[2, 172802]`), it rotates through them sequentially.</p>
                    </div>
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-white/5 space-y-1">
                      <span className="font-semibold text-white">dataIds Sequence</span>
                      <p className="text-slate-400">Associates season index with content configs. The dataId cycles through `dataIds` array as seasons progress.</p>
                    </div>
                  </div>
                </div>

                {/* Manual Events Rules */}
                <div className="space-y-4">
                  <h3 className="text-md font-display text-white border-b border-white/10 pb-2">2. Manual Events</h3>
                  <p className="text-xs text-slate-400">
                    Manual events run ONLY during explicit schedules configured in an array. Perfect for unique Seasonal Minigames (Dice, Plant, Fishing, Bingo, Mining) or special non-repeating events.
                  </p>

                  <div className="bg-slate-900/50 border border-white/5 rounded-lg p-4 font-mono-custom text-xs text-slate-300 space-y-2">
                    <div className="text-violet-400 font-semibold">// Example JSON Config structure</div>
                    <pre className="overflow-x-auto">
{`{
  "manualSeason": [
    {
      "timeStart": 20260422000001,  // Starts April 22, 2026, 00:00:01
      "timeEnd": 20260508000001,    // Ends May 8, 2026, 00:00:01
      "season": 1,                  // Season identifier
      "dataId": 0,                  // Content Data ID
      "lockedDuration": 172800      // Restrict duration to 2 days (optional)
    }
  ]
}`}
                    </pre>
                  </div>
                </div>

                {/* Formatting Cheat Sheet */}
                <div className="space-y-4">
                  <h3 className="text-md font-display text-white border-b border-white/10 pb-2">Column Schemas & Time Values</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-xs">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-white">Parameter</th>
                          <th className="px-3 py-2 text-left font-semibold text-white">Format</th>
                          <th className="px-3 py-2 text-left font-semibold text-white">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="px-3 py-2 text-violet-400 font-mono">Date format</td>
                          <td className="px-3 py-2 font-mono">YYYYMMDDhhmmss</td>
                          <td className="px-3 py-2 text-slate-400">14-digit integer. e.g. `20260216000001`</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-violet-400 font-mono">14d in seconds</td>
                          <td className="px-3 py-2 font-mono">1,209,600 s</td>
                          <td className="px-3 py-2 text-slate-400">Duration of standard 2-week Battle Pass.</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-violet-400 font-mono">7d in seconds</td>
                          <td className="px-3 py-2 font-mono">604,800 s</td>
                          <td className="px-3 py-2 text-slate-400">Standard 1-week event.</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-violet-400 font-mono">3d in seconds</td>
                          <td className="px-3 py-2 font-mono">259,200 s</td>
                          <td className="px-3 py-2 text-slate-400">Standard 3-day event.</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-violet-400 font-mono">2d in seconds</td>
                          <td className="px-3 py-2 font-mono">172,800 s</td>
                          <td className="px-3 py-2 text-slate-400">Standard weekend event.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400/90 rounded-lg p-4 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <HelpCircle size={14} />
                    <span>Import/Export Tips</span>
                  </div>
                  <p className="leading-relaxed">
                    When importing via CSV, make sure the columns match these exact spellings. The **Remote Config Data** column must contain valid, escaped JSON. Google Sheets will automatically escape it correctly when using the "Publish as CSV" function.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
