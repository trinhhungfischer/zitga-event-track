export interface LoopConfig {
  rule: {
    timeStart: number; // e.g. 20260112000001
    duration: number;  // in seconds
    seasonStart: number;
    intervals: number[];
    dataIds: number[];
    lockedDuration?: number;
  };
  overrideSeason?: {
    timeStart: number;
    timeEnd: number;
    season: number;
    dataId: number;
    lockedDuration?: number;
  };
}

export interface ManualSeason {
  timeStart: number;
  timeEnd: number;
  season: number;
  dataId: number;
  lockedDuration?: number;
}

export interface ManualConfig {
  manualSeason: ManualSeason[];
}

export interface GameEvent {
  id: number;
  name: string;
  doc: string;
  patch: string;
  dateStart: string;
  dateEnd: string;
  loop: boolean;
  type: string; // e.g. "Always", "Growth", "Weekend", "Hero Exclusive", "New Minigame"
  unlockAt: string;
  durationStr: string;
  intervalStr: string;
  sandboxName: string;
  realName: string;
  remoteConfigStr: string; // raw JSON string representing LoopConfig or ManualConfig
  iaps: string;
  currentSeason: string;
}

export interface ScheduledOccurrence {
  eventId: number;
  eventName: string;
  eventType: string;
  season: number;
  dataId: number;
  timeStart: Date;
  timeEnd: Date;
  isOverride?: boolean;
  duration?: number;
  lockedDuration?: number;
}
