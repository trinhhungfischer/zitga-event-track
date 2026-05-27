# Zitga Event Track Configurator

A premium, interactive web application built with **React**, **TypeScript**, and **Tailwind CSS** for game designers to view, CRUD, import/export, and inspect operations schedules (loops and manual occurrences) for live-ops game events.

---

## 🚀 Key Features

1. **Dynamic Configuration Dashboard & Stats:**
   - Visual statistics tracking total game event modules, active loop schedulers, manual calendars, and live indicators.
   - Quick search by name, sandbox keys, and real names.
   - Patch and Category pills multi-select filters.

2. **Ultra-Readable Monthly Grid Calendar Planner:**
   - Dynamic Year Selector supporting scrolling and direct dropdown selection across **2025 to 2030**.
   - Rolling continuous monthly traversal (auto-advancing/declining years on boundary crossing).
   - Cozy, top-aligned day cells expanded to **`120px`** row height.
   - Clear event tag capsules (`text-[10px]`) showing season labels and responsive hover text.

3. **Sub-Day Precision Timeline Calendar:**
   - Gantt-chart visualizer with sub-day starting offsets and durations.
   - Detailed interactive hover inspect tooltips outlining season duration, start/end dates, override flags, and unlocked chapters.

4. **Dynamic Event Category Creators:**
   - Inline creation of custom event categories in the CRUD Event Form with simple toggle options.
   - Automatic active filtering sync upon saving custom event modules.
   - Gorgeous dynamic color-hashing visual system cycling custom categories across Cyan, Fuchsia, Pink, Orange, and Teal templates.

5. **Local CSV & Google Sheets Integrations:**
   - Fully compliant RFC 4180 state-machine double-quotes CSV Parser.
   - Drag-and-drop CSV importer, CSV exporter, and published live Google Sheets CSV connectors.

6. **Admin Credentials Lock:**
   - Full CRUD actions, duplicate templates, import files, and database resets are locked behind standard admin credentials.
   - Contact the lead game designer or administrator to obtain the login details.

---

## 🛠️ Code Structure

```
event-track/
├── .gitignore                       # Ignored build artifacts and node directories
├── README.md                        # Root operations manual
├── 020-stickman-xx...pdf            # Seed PDF layout specification
└── event-track-ui/                  # Frontend single-page React app
    ├── src/
    │   ├── App.tsx                  # Main Orchestrator with lifted filter state
    │   ├── types.ts                 # TS schema contracts for events & scheduling
    │   ├── index.css                # Font imports & custom CSS backdrop panel styling
    │   ├── components/
    │   │   ├── EventDashboard.tsx   # Dashboard list and stats blocks
    │   │   ├── EventTimeline.tsx    # Interactive Gantt rows
    │   │   ├── EventCalendarView.tsx# Dynamic multi-year monthly grid
    │   │   ├── EventForm.tsx        # Slide modal forms with bidirectional JSON editor
    │   │   ├── CSVImportExport.tsx  # Local file loaders & Google Sheets connector
    │   │   └── PDFReference.tsx     # Floating OCR text side drawer cheatsheet
    │   └── utils/
    │       ├── dateUtils.ts         # Math loop schedulers and game time parser
    │       ├── csvUtils.ts          # State-machine RFC 4180 CSV serializer
    │       └── eventData.ts         # Preloaded seed events from the PDF
```

---

## 💻 Local Setup & Development

### 1. Requirements
Ensure you have **Node.js v18+** installed.

### 2. Installation
Navigate into the frontend project folder:
```bash
cd event-track-ui
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the app!

### 4. Build Production Bundle
```bash
npm run build
```

---

## ☁️ Vercel Deployment Instructions

### Method 1: Git-Connected Automated Deployment (Recommended)
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** > **Project**.
3. Select your connected GitHub account and import the repository `zitga-event-track`.
4. In the configuration page, set:
   - **Framework Preset:** `Vite` (Vercel should auto-detect this).
   - **Root Directory:** `event-track-ui` (**CRITICAL**: Make sure to point this to the UI subdirectory since the project root contains the PDF and other files!).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**! Vercel will build and host your configurator immediately, updating the website automatically every time you `git push` to GitHub!

### Method 2: Manual CLI Deployment
If you prefer not to connect your GitHub account directly:
1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Navigate into the UI directory:
   ```bash
   cd event-track-ui
   ```
3. Run the deployment command:
   ```bash
   vercel
   ```
4. Follow the command prompt logs to link, build, and publish!
