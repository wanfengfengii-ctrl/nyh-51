export interface BeaconTower {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  visualRange: number;
  garrisonCount: number;
  baseGarrisonCount: number;
  signalDelay: number;
  isActive: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  disabledUntil?: number;
}

export interface Weather {
  id: string;
  name: string;
  visibilityFactor: number;
  description: string;
  icon: string;
}

export interface EnemyLevel {
  id: string;
  name: string;
  signalType: 'smoke' | 'fire' | 'both';
  priority: number;
  description: string;
  delayFactor: number;
  smokeCount: number;
  fireIntensity: number;
  pathStrategy: 'fastest' | 'shortest' | 'mostReliable' | 'redundant';
}

export interface SignalPath {
  id: string;
  towers: string[];
  totalTime: number;
  totalDistance: number;
  isOptimal: boolean;
  reliability: number;
  enemySourceId?: string;
}

export interface EnemySource {
  id: string;
  name: string;
  level: EnemyLevel;
  startTowerId: string;
  endTowerId: string;
  createdAt: number;
  priority: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'merged';
  color: string;
  mergedInto?: string;
  mergedFrom?: string[];
}

export interface SignalMission {
  id: string;
  enemySourceId: string;
  path: SignalPath;
  currentStep: number;
  currentTime: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'interrupted';
  activeTowers: string[];
  signalProgress: number;
  startTime?: number;
  endTime?: number;
  failedReason?: string;
  interruptions: number;
}

export interface GarrisonDispatch {
  id: string;
  fromTowerId: string;
  toTowerId: string;
  count: number;
  startTime: number;
  duration: number;
  status: 'pending' | 'active' | 'completed';
  reason: string;
}

export interface WeatherEvent {
  id: string;
  weather: Weather;
  startTime: number;
  duration: number;
  affectedTowers: string[];
  triggerType: 'automatic' | 'manual';
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentStep: number;
  currentTime: number;
  activeTowers: string[];
  currentPath: string[];
  signalProgress: number;
  globalTime: number;
  isReplaying: boolean;
  replayTime: number;
  replaySpeed: number;
}

export interface BlindSpot {
  towerId: string;
  reason: string;
  firstDetected: number;
  resolvedAt?: number;
}

export interface TowerDelayInfo {
  towerId: string;
  delay: number;
  isSevere: boolean;
  missionCount: number;
}

export interface HistoryEvent {
  id: string;
  timestamp: number;
  type: 
    | 'enemy_detected' 
    | 'enemy_merged' 
    | 'signal_start' 
    | 'signal_reach' 
    | 'signal_complete' 
    | 'signal_failed'
    | 'signal_interrupted'
    | 'garrison_dispatch' 
    | 'weather_change' 
    | 'tower_disabled'
    | 'tower_recovered'
    | 'path_recalculated'
    | 'simulation_start'
    | 'simulation_end';
  data: Record<string, unknown>;
  description: string;
}

export interface StateSnapshot {
  timestamp: number;
  towers: BeaconTower[];
  missions: SignalMission[];
  weather: Weather;
  dispatches: GarrisonDispatch[];
  activePaths: SignalPath[];
}

export interface EvaluationResult {
  totalSimulationTime: number;
  totalEnemySources: number;
  completedMissions: number;
  failedMissions: number;
  successRate: number;
  averageDeliveryTime: number;
  minDeliveryTime: number;
  maxDeliveryTime: number;
  totalDispatches: number;
  weatherChanges: number;
  towerFailures: number;
  towerRecoveries: number;
  blindSpotHistory: { time: number; count: number }[];
  bottleneckTowers: { towerId: string; delay: number; missionCount: number }[];
  criticalTowers: string[];
  signalTypes: { type: string; count: number }[];
  pathStrategyEffectiveness: { strategy: string; successRate: number; avgTime: number }[];
  recommendations: string[];
}
